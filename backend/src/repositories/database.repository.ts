import { access } from 'node:fs/promises';
import type { Database, StoredPasskey, User } from '../domain/models.js';
import { conflict, notFound, serviceUnavailable } from '../http/errors.js';
import { deepClone, Mutex, readJson, writeJsonAtomic } from '../utils/atomic-json.js';

const EMPTY_DATABASE: Database = {
  schemaVersion: 1,
  users: [],
};

export class DatabaseRepository {
  private readonly mutex = new Mutex();

  public constructor(private readonly filePath: string) {}

  public async initialize(): Promise<void> {
    try {
      await access(this.filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      await writeJsonAtomic(this.filePath, EMPTY_DATABASE);
    }
    const database = await readJson<Database>(this.filePath);
    this.assertDatabase(database);
  }

  public async snapshot(): Promise<Database> {
    return this.mutex.run(async () => deepClone(await this.readValidated()));
  }

  public async findUserById(userId: string): Promise<User | null> {
    const database = await this.snapshot();
    return database.users.find((user) => user.id === userId) ?? null;
  }

  public async findUserByUsername(username: string): Promise<User | null> {
    const normalized = username.toLocaleLowerCase('en-US');
    const database = await this.snapshot();
    return database.users.find((user) => user.username.toLocaleLowerCase('en-US') === normalized) ?? null;
  }

  public async findUserByCredentialId(credentialId: string): Promise<User | null> {
    const database = await this.snapshot();
    return database.users.find((user) => user.passkeys.some((passkey) => passkey.id === credentialId)) ?? null;
  }

  public async createSession(id: string, userId: string, expiresAt: number): Promise<void> {
    await this.mutate((db) => {
      this.pruneAuthentication(db);
      // Bound persistent sessions for a single account while preserving other users.
      const owned = db.sessions!.filter((session) => session.userId === userId);
      const evicted = new Set(owned.slice(0, Math.max(0, owned.length - 49)).map((session) => session.id));
      db.sessions = db.sessions!.filter((session) => !evicted.has(session.id));
      db.sessions.push({ id, userId, expiresAt });
    });
  }

  public async hasSession(id: string, userId: string): Promise<boolean> {
    const db = await this.snapshot();
    return db.sessions!.some((session) => session.id === id && session.userId === userId && session.expiresAt > Date.now() / 1000);
  }

  public async revokeSession(id: string): Promise<void> {
    await this.mutate((db) => { this.pruneAuthentication(db); db.sessions = db.sessions!.filter((session) => session.id !== id); });
  }

  public async createAuthFlow(id: string, expiresAt: number): Promise<void> {
    await this.mutate((db) => {
      this.pruneAuthentication(db);
      if (db.authFlows!.length >= 10_000) throw conflict('Demasiadas solicitudes de acceso; vuelve a intentarlo más tarde');
      db.authFlows!.push({ id, expiresAt });
    });
  }

  public async consumeAuthFlow(id: string): Promise<boolean> {
    return this.mutate((db) => {
      this.pruneAuthentication(db);
      const index = db.authFlows!.findIndex((flow) => flow.id === id);
      if (index < 0) return false;
      db.authFlows!.splice(index, 1);
      return true;
    });
  }

  private pruneAuthentication(db: Database): void {
    const now = Date.now() / 1000;
    db.sessions = db.sessions!.filter((session) => session.expiresAt > now);
    db.authFlows = db.authFlows!.filter((flow) => flow.expiresAt > now);
  }

  public async createUser(user: User): Promise<User> {
    return this.mutate((database) => {
      if (database.users.some((candidate) => candidate.username.toLowerCase() === user.username.toLowerCase())) {
        throw conflict('Username is already registered');
      }
      if (database.users.some((candidate) => candidate.passkeys.some((passkey) => passkey.id === user.passkeys[0]?.id))) {
        throw conflict('Passkey is already registered');
      }
      database.users.push(deepClone(user));
      return deepClone(user);
    });
  }

  public async addPasskey(userId: string, passkey: StoredPasskey): Promise<User> {
    return this.mutate((database) => {
      if (database.users.some((user) => user.passkeys.some((candidate) => candidate.id === passkey.id))) {
        throw conflict('Passkey is already registered');
      }
      const user = database.users.find((candidate) => candidate.id === userId);
      if (!user) throw notFound('User not found');
      user.passkeys.push(deepClone(passkey));
      user.updatedAt = new Date().toISOString();
      return deepClone(user);
    });
  }

  public async updatePasskey(
    userId: string,
    credentialId: string,
    update: Pick<StoredPasskey, 'counter' | 'deviceType' | 'backedUp' | 'lastUsedAt'>,
  ): Promise<User> {
    return this.mutate((database) => {
      const user = database.users.find((candidate) => candidate.id === userId);
      if (!user) throw notFound('User not found');
      const passkey = user.passkeys.find((candidate) => candidate.id === credentialId);
      if (!passkey) throw notFound('Passkey not found');
      Object.assign(passkey, update);
      user.updatedAt = new Date().toISOString();
      return deepClone(user);
    });
  }

  public async removePasskey(userId: string, credentialId: string): Promise<User> {
    return this.mutate((database) => {
      const user = database.users.find((candidate) => candidate.id === userId);
      if (!user) throw notFound('User not found');
      if (user.passkeys.length <= 1 && !user.passwordCredential) {
        throw conflict('La cuenta debe conservar al menos un método de acceso');
      }
      const index = user.passkeys.findIndex((passkey) => passkey.id === credentialId);
      if (index === -1) throw notFound('Passkey not found');
      user.passkeys.splice(index, 1);
      user.updatedAt = new Date().toISOString();
      return deepClone(user);
    });
  }

  private async mutate<T>(operation: (database: Database) => T): Promise<T> {
    return this.mutex.run(async () => {
      const database = await this.readValidated();
      const result = operation(database);
      await writeJsonAtomic(this.filePath, database);
      return result;
    });
  }

  private async readValidated(): Promise<Database> {
    try {
      const database = await readJson<Database>(this.filePath);
      this.assertDatabase(database);
      return database;
    } catch {
      console.error(JSON.stringify({ level: 'error', event: 'database_read_failed' }));
      throw serviceUnavailable('No pudimos acceder a las cuentas guardadas. El archivo se conserva sin cambios para su revisión.');
    }
  }

  private assertDatabase(value: Database): void {
    if (!value || typeof value !== 'object' || value.schemaVersion !== 1 || !Array.isArray(value.users)) {
      throw new Error('Unsupported or malformed db.json');
    }
    value.sessions ??= [];
    value.authFlows ??= [];
    if (!Array.isArray(value.sessions) || !Array.isArray(value.authFlows) ||
      value.sessions.some((s) => !s || typeof s.id !== 'string' || typeof s.userId !== 'string' || !Number.isSafeInteger(s.expiresAt)) ||
      value.authFlows.some((s) => !s || typeof s.id !== 'string' || !Number.isSafeInteger(s.expiresAt))) {
      throw new Error('Malformed authentication records in db.json');
    }
    for (const user of value.users) {
      if (!user || typeof user !== 'object') throw new Error('Malformed user record in db.json');
      user.stateFileKey ??= user.username;
      user.passwordCredential ??= null;
      if (typeof user.id !== 'string' || !user.id || typeof user.username !== 'string' || !user.username ||
        typeof user.stateFileKey !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(user.stateFileKey) || !Array.isArray(user.passkeys) ||
        typeof user.webauthnUserId !== 'string' || !user.webauthnUserId || typeof user.displayName !== 'string' ||
        !validInstant(user.createdAt) || !validInstant(user.updatedAt)) {
        throw new Error('Malformed user record in db.json');
      }
      for (const passkey of user.passkeys) {
        if (!passkey || typeof passkey !== 'object' || typeof passkey.id !== 'string' || !passkey.id ||
          typeof passkey.publicKey !== 'string' || !passkey.publicKey || !Number.isSafeInteger(passkey.counter) || passkey.counter < 0 ||
          !Array.isArray(passkey.transports) || passkey.transports.some((transport) => typeof transport !== 'string') ||
          !['singleDevice', 'multiDevice'].includes(passkey.deviceType) || typeof passkey.backedUp !== 'boolean' ||
          !validInstant(passkey.createdAt) || (passkey.lastUsedAt !== null && !validInstant(passkey.lastUsedAt))) {
          throw new Error('Malformed passkey record in db.json');
        }
      }
      const password = user.passwordCredential;
      if (password !== null && (!password || typeof password !== 'object' || password.algorithm !== 'scrypt' ||
        typeof password.salt !== 'string' || typeof password.hash !== 'string' ||
        ![password.keyLength, password.cost, password.blockSize, password.parallelization].every((value) => Number.isSafeInteger(value) && value > 0) ||
        !validInstant(password.createdAt))) throw new Error('Malformed password record in db.json');
    }
    for (const ids of [value.users.map((user) => user.id), value.users.map((user) => user.username.toLowerCase()),
      value.users.map((user) => user.stateFileKey), value.users.flatMap((user) => user.passkeys.map((passkey) => passkey.id)),
      value.sessions.map((session) => session.id), value.authFlows.map((flow) => flow.id)]) {
      if (new Set(ids).size !== ids.length) throw new Error('Duplicate identifiers in db.json');
    }
  }
}

function validInstant(value: unknown): boolean {
  return typeof value === 'string' && value.length <= 40 && !Number.isNaN(Date.parse(value));
}
