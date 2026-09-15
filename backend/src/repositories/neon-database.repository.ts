import { neon } from '@neondatabase/serverless';
import type { Database, StoredPasskey, User } from '../domain/models.js';
import { conflict, notFound } from '../http/errors.js';
import type { AccountRepository } from './contracts.js';

interface DocumentRow { document: User | string }
interface SessionRow { id: string; user_id: string; expires_at: string | number }
interface FlowRow { id: string; expires_at: string | number }

export class NeonDatabaseRepository implements AccountRepository {
  private readonly sql: ReturnType<typeof neon>;

  public constructor(databaseUrl: string) {
    this.sql = neon(databaseUrl);
  }

  public async initialize(): Promise<void> {
    await this.sql`CREATE TABLE IF NOT EXISTS forja_users (
      id text PRIMARY KEY,
      username_key text NOT NULL UNIQUE,
      state_file_key text NOT NULL UNIQUE,
      document jsonb NOT NULL,
      version bigint NOT NULL DEFAULT 1,
      updated_at timestamptz NOT NULL DEFAULT now()
    )`;
    await this.sql`CREATE TABLE IF NOT EXISTS forja_passkeys (
      credential_id text PRIMARY KEY,
      user_id text NOT NULL REFERENCES forja_users(id) ON DELETE CASCADE
    )`;
    await this.sql`CREATE INDEX IF NOT EXISTS forja_passkeys_user_idx ON forja_passkeys(user_id)`;
    await this.sql`CREATE TABLE IF NOT EXISTS forja_sessions (
      id text PRIMARY KEY,
      user_id text NOT NULL REFERENCES forja_users(id) ON DELETE CASCADE,
      expires_at bigint NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`;
    await this.sql`CREATE INDEX IF NOT EXISTS forja_sessions_user_idx ON forja_sessions(user_id, created_at DESC)`;
    await this.sql`CREATE INDEX IF NOT EXISTS forja_sessions_expiry_idx ON forja_sessions(expires_at)`;
    await this.sql`CREATE TABLE IF NOT EXISTS forja_auth_flows (
      id text PRIMARY KEY,
      expires_at bigint NOT NULL
    )`;
    await this.sql`CREATE INDEX IF NOT EXISTS forja_auth_flows_expiry_idx ON forja_auth_flows(expires_at)`;
    await this.sql`CREATE TABLE IF NOT EXISTS forja_login_attempts (
      attempt_key text PRIMARY KEY,
      failures integer NOT NULL,
      window_started_at timestamptz NOT NULL,
      blocked_until timestamptz NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )`;
    await this.sql`CREATE INDEX IF NOT EXISTS forja_login_attempts_updated_idx ON forja_login_attempts(updated_at)`;
    await this.sql`CREATE TABLE IF NOT EXISTS forja_user_states (
      user_id text PRIMARY KEY REFERENCES forja_users(id) ON DELETE CASCADE,
      revision bigint NOT NULL,
      document jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )`;
  }

  public async snapshot(): Promise<Database> {
    const [userRows, sessionRows, flowRows] = await Promise.all([
      this.query<DocumentRow>('SELECT document FROM forja_users ORDER BY id'),
      this.query<SessionRow>('SELECT id, user_id, expires_at FROM forja_sessions WHERE expires_at > $1', [nowSeconds()]),
      this.query<FlowRow>('SELECT id, expires_at FROM forja_auth_flows WHERE expires_at > $1', [nowSeconds()]),
    ]);
    return {
      schemaVersion: 1,
      users: userRows.map((row) => documentValue(row.document)),
      sessions: sessionRows.map((row) => ({ id: row.id, userId: row.user_id, expiresAt: Number(row.expires_at) })),
      authFlows: flowRows.map((row) => ({ id: row.id, expiresAt: Number(row.expires_at) })),
    };
  }

  public async findUserById(userId: string): Promise<User | null> {
    return this.findOne('SELECT document FROM forja_users WHERE id = $1', [userId]);
  }

  public async findUserByUsername(username: string): Promise<User | null> {
    return this.findOne('SELECT document FROM forja_users WHERE username_key = $1', [username.toLocaleLowerCase('en-US')]);
  }

  public async findUserByCredentialId(credentialId: string): Promise<User | null> {
    return this.findOne(
      'SELECT u.document FROM forja_users u JOIN forja_passkeys p ON p.user_id = u.id WHERE p.credential_id = $1',
      [credentialId],
    );
  }

  public async createSession(id: string, userId: string, expiresAt: number): Promise<void> {
    await this.sql.transaction([
      this.sql`DELETE FROM forja_sessions WHERE expires_at <= ${nowSeconds()}`,
      this.sql`INSERT INTO forja_sessions (id, user_id, expires_at) VALUES (${id}, ${userId}, ${expiresAt})`,
      this.sql`DELETE FROM forja_sessions WHERE id IN (
        SELECT id FROM forja_sessions WHERE user_id = ${userId}
        ORDER BY created_at DESC, id DESC OFFSET 50
      )`,
    ]);
  }

  public async hasSession(id: string, userId: string): Promise<boolean> {
    const rows = await this.query<{ present: boolean }>(
      'SELECT EXISTS(SELECT 1 FROM forja_sessions WHERE id = $1 AND user_id = $2 AND expires_at > $3) AS present',
      [id, userId, nowSeconds()],
    );
    return rows[0]?.present === true;
  }

  public async revokeSession(id: string): Promise<void> {
    await this.sql`DELETE FROM forja_sessions WHERE id = ${id}`;
  }

  public async createAuthFlow(id: string, expiresAt: number): Promise<void> {
    await this.sql`DELETE FROM forja_auth_flows WHERE expires_at <= ${nowSeconds()}`;
    const rows = await this.query<{ count: string | number }>('SELECT count(*) AS count FROM forja_auth_flows');
    if (Number(rows[0]?.count ?? 0) >= 10_000) {
      throw conflict('Demasiadas solicitudes de acceso; vuelve a intentarlo más tarde');
    }
    await this.sql`INSERT INTO forja_auth_flows (id, expires_at) VALUES (${id}, ${expiresAt})`;
  }

  public async consumeAuthFlow(id: string): Promise<boolean> {
    const rows = await this.query<{ id: string }>(
      'DELETE FROM forja_auth_flows WHERE id = $1 AND expires_at > $2 RETURNING id',
      [id, nowSeconds()],
    );
    return rows.length === 1;
  }

  public async createUser(user: User): Promise<User> {
    const queries = [
      this.sql`INSERT INTO forja_users (id, username_key, state_file_key, document)
        VALUES (${user.id}, ${user.username.toLocaleLowerCase('en-US')}, ${user.stateFileKey}, ${JSON.stringify(user)}::jsonb)`,
      ...user.passkeys.map((passkey) => this.sql`INSERT INTO forja_passkeys (credential_id, user_id)
        VALUES (${passkey.id}, ${user.id})`),
    ];
    try {
      await this.sql.transaction(queries);
      return structuredClone(user);
    } catch (error) {
      if (postgresCode(error) === '23505') throw conflict('Ese usuario o Passkey ya está registrado');
      throw error;
    }
  }

  public async addPasskey(userId: string, passkey: StoredPasskey): Promise<User> {
    const now = new Date().toISOString();
    try {
      const rows = await this.query<DocumentRow>(`WITH inserted AS (
        INSERT INTO forja_passkeys (credential_id, user_id) VALUES ($1, $2)
        ON CONFLICT DO NOTHING RETURNING credential_id
      ), updated AS (
        UPDATE forja_users
        SET document = jsonb_set(
              jsonb_set(document, '{passkeys}', (document->'passkeys') || $3::jsonb),
              '{updatedAt}', to_jsonb($4::text)
            ),
            version = version + 1,
            updated_at = now()
        WHERE id = $2 AND EXISTS (SELECT 1 FROM inserted)
        RETURNING document
      ) SELECT document FROM updated`, [passkey.id, userId, JSON.stringify(passkey), now]);
      if (rows[0]) return documentValue(rows[0].document);
      if (!await this.findUserById(userId)) throw notFound('User not found');
      throw conflict('Passkey is already registered');
    } catch (error) {
      if (postgresCode(error) === '23505') throw conflict('Passkey is already registered');
      throw error;
    }
  }

  public async updatePasskey(
    userId: string,
    credentialId: string,
    update: Pick<StoredPasskey, 'counter' | 'deviceType' | 'backedUp' | 'lastUsedAt'>,
  ): Promise<User> {
    const now = new Date().toISOString();
    const rows = await this.query<DocumentRow>(`UPDATE forja_users
      SET document = jsonb_set(
            jsonb_set(document, '{passkeys}', (
              SELECT jsonb_agg(CASE WHEN item->>'id' = $2 THEN item || $3::jsonb ELSE item END)
              FROM jsonb_array_elements(document->'passkeys') AS item
            )),
            '{updatedAt}', to_jsonb($4::text)
          ),
          version = version + 1,
          updated_at = now()
      WHERE id = $1 AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(document->'passkeys') AS item WHERE item->>'id' = $2
      )
      RETURNING document`, [userId, credentialId, JSON.stringify(update), now]);
    if (rows[0]) return documentValue(rows[0].document);
    if (!await this.findUserById(userId)) throw notFound('User not found');
    throw notFound('Passkey not found');
  }

  public async removePasskey(userId: string, credentialId: string): Promise<User> {
    const now = new Date().toISOString();
    const rows = await this.query<DocumentRow>(`WITH updated AS (
      UPDATE forja_users
      SET document = jsonb_set(
            jsonb_set(document, '{passkeys}', (
              SELECT COALESCE(jsonb_agg(item), '[]'::jsonb)
              FROM jsonb_array_elements(document->'passkeys') AS item WHERE item->>'id' <> $2
            )),
            '{updatedAt}', to_jsonb($3::text)
          ),
          version = version + 1,
          updated_at = now()
      WHERE id = $1
        AND EXISTS (SELECT 1 FROM jsonb_array_elements(document->'passkeys') AS item WHERE item->>'id' = $2)
        AND (jsonb_array_length(document->'passkeys') > 1 OR document->'passwordCredential' <> 'null'::jsonb)
      RETURNING document
    ), removed AS (
      DELETE FROM forja_passkeys WHERE credential_id = $2 AND user_id = $1 AND EXISTS (SELECT 1 FROM updated)
    ) SELECT document FROM updated`, [userId, credentialId, now]);
    if (rows[0]) return documentValue(rows[0].document);
    const user = await this.findUserById(userId);
    if (!user) throw notFound('User not found');
    if (!user.passkeys.some((passkey) => passkey.id === credentialId)) throw notFound('Passkey not found');
    throw conflict('La cuenta debe conservar al menos un método de acceso');
  }

  public async reservePasswordAttempt(key: string): Promise<boolean> {
    await this.sql`DELETE FROM forja_login_attempts WHERE updated_at < now() - interval '1 hour'`;
    const rows = await this.query<{ failures: number; was_blocked: boolean }>(`INSERT INTO forja_login_attempts
      (attempt_key, failures, window_started_at, blocked_until, updated_at)
      SELECT $1, 1, now(), to_timestamp(0), now()
      WHERE EXISTS (SELECT 1 FROM forja_login_attempts WHERE attempt_key = $1)
         OR (SELECT count(*) FROM forja_login_attempts) < 10000
      ON CONFLICT (attempt_key) DO UPDATE SET
        failures = CASE
          WHEN forja_login_attempts.blocked_until > now() THEN forja_login_attempts.failures + 1
          WHEN forja_login_attempts.window_started_at <= now() - interval '15 minutes' THEN 1
          ELSE forja_login_attempts.failures + 1
        END,
        window_started_at = CASE
          WHEN forja_login_attempts.window_started_at <= now() - interval '15 minutes' THEN now()
          ELSE forja_login_attempts.window_started_at
        END,
        blocked_until = CASE
          WHEN forja_login_attempts.blocked_until > now() THEN forja_login_attempts.blocked_until
          WHEN forja_login_attempts.window_started_at <= now() - interval '15 minutes' THEN to_timestamp(0)
          WHEN forja_login_attempts.failures + 1 >= 5 THEN now() + interval '15 minutes'
          ELSE forja_login_attempts.blocked_until
        END,
        updated_at = now()
      RETURNING failures, blocked_until > now() AND failures >= 5 AS was_blocked`, [key]);
    const row = rows[0];
    if (!row) return false;
    // The fifth attempt is allowed; subsequent attempts remain blocked.
    return !(row.was_blocked && Number(row.failures) > 5);
  }

  public async clearPasswordAttempts(key: string): Promise<void> {
    await this.sql`DELETE FROM forja_login_attempts WHERE attempt_key = ${key}`;
  }

  private async findOne(query: string, parameters: unknown[]): Promise<User | null> {
    const rows = await this.query<DocumentRow>(query, parameters);
    return rows[0] ? documentValue(rows[0].document) : null;
  }

  private async query<T>(query: string, parameters: unknown[] = []): Promise<T[]> {
    return await this.sql.query(query, parameters) as T[];
  }
}

function documentValue(value: User | string): User {
  return structuredClone(typeof value === 'string' ? JSON.parse(value) as User : value);
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1_000);
}

function postgresCode(error: unknown): string | null {
  return typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
    ? error.code
    : null;
}
