import { access } from 'node:fs/promises';
import type { Database, StoredPasskey, User } from '../domain/models.js';
import { conflict, notFound } from '../http/errors.js';
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
    } catch {
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
    const database = await readJson<Database>(this.filePath);
    this.assertDatabase(database);
    return database;
  }

  private assertDatabase(value: Database): void {
    if (value.schemaVersion !== 1 || !Array.isArray(value.users)) {
      throw new Error('Unsupported or malformed db.json');
    }
    for (const user of value.users) {
      user.stateFileKey ??= user.username;
      user.passwordCredential ??= null;
      if (!user.id || !user.username || !Array.isArray(user.passkeys)) {
        throw new Error('Malformed user record in db.json');
      }
    }
  }
}
