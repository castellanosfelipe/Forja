import { neon } from '@neondatabase/serverless';
import type { User, UserState } from '../domain/models.js';
import { conflict, serviceUnavailable } from '../http/errors.js';
import { deepClone } from '../utils/atomic-json.js';
import type { StateRepository } from './contracts.js';
import { createEmptyState, normalizeAndValidateState } from './user-state.document.js';

interface StateRow {
  revision: string | number;
  document: UserState | string;
}

const MAX_WRITE_ATTEMPTS = 6;

export class NeonUserStateRepository implements StateRepository {
  private readonly sql: ReturnType<typeof neon>;

  public constructor(databaseUrl: string) {
    this.sql = neon(databaseUrl);
  }

  public async getOrCreate(user: User): Promise<UserState> {
    const initial = createEmptyState(user);
    await this.sql`INSERT INTO forja_user_states (user_id, revision, document)
      VALUES (${user.id}, ${initial.revision}, ${JSON.stringify(initial)}::jsonb)
      ON CONFLICT (user_id) DO NOTHING`;
    for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt += 1) {
      const current = await this.read(user);
      const normalized = normalizeAndValidateState(deepClone(current), user);
      if (JSON.stringify(normalized) === JSON.stringify(current)) return normalized;
      normalized.revision = current.revision + 1;
      normalized.owner.updatedAt = new Date().toISOString();
      const saved = await this.compareAndSwap(user.id, current.revision, normalized);
      if (saved) return saved;
    }
    throw serviceUnavailable('Tus datos están recibiendo demasiadas actualizaciones simultáneas. Inténtalo nuevamente.');
  }

  public async replace(user: User, candidate: unknown, expectedRevision: number | null): Promise<UserState> {
    for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt += 1) {
      const current = await this.getOrCreate(user);
      if (expectedRevision !== null && current.revision !== expectedRevision) {
        throw conflict(`State revision mismatch; current revision is ${current.revision}`);
      }
      const input = normalizeAndValidateState(deepClone(candidate) as UserState, user);
      input.pushSubscriptions = current.pushSubscriptions;
      input.restTimers = current.restTimers;
      input.revision = current.revision + 1;
      input.owner.createdAt = current.owner.createdAt;
      input.owner.updatedAt = new Date().toISOString();
      input.owner.userId = user.id;
      input.owner.stateFileKey = user.stateFileKey;
      const saved = await this.compareAndSwap(user.id, current.revision, input);
      if (saved) return saved;
    }
    throw conflict('Tus datos cambiaron en otro dispositivo. Actualiza la página y vuelve a intentarlo.');
  }

  public async mutate(user: User, operation: (state: UserState) => void): Promise<UserState> {
    for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt += 1) {
      const current = await this.getOrCreate(user);
      const next = deepClone(current);
      operation(next);
      next.revision = current.revision + 1;
      next.owner.updatedAt = new Date().toISOString();
      normalizeAndValidateState(next, user);
      const saved = await this.compareAndSwap(user.id, current.revision, next);
      if (saved) return saved;
    }
    throw conflict('Tus datos cambiaron en otro dispositivo. Actualiza la página y vuelve a intentarlo.');
  }

  private async read(user: User): Promise<UserState> {
    const rows = await this.query<StateRow>(
      'SELECT revision, document FROM forja_user_states WHERE user_id = $1',
      [user.id],
    );
    const row = rows[0];
    if (!row) throw serviceUnavailable('No pudimos crear el espacio de datos de tu cuenta');
    const state = documentValue(row.document);
    state.revision = Number(row.revision);
    return normalizeAndValidateState(state, user);
  }

  private async compareAndSwap(userId: string, expectedRevision: number, state: UserState): Promise<UserState | null> {
    const rows = await this.query<StateRow>(`UPDATE forja_user_states
      SET revision = $3, document = $4::jsonb, updated_at = now()
      WHERE user_id = $1 AND revision = $2
      RETURNING revision, document`, [userId, expectedRevision, state.revision, JSON.stringify(state)]);
    if (!rows[0]) return null;
    const saved = documentValue(rows[0].document);
    saved.revision = Number(rows[0].revision);
    return saved;
  }

  private async query<T>(query: string, parameters: unknown[] = []): Promise<T[]> {
    return await this.sql.query(query, parameters) as T[];
  }
}

function documentValue(value: UserState | string): UserState {
  return structuredClone(typeof value === 'string' ? JSON.parse(value) as UserState : value);
}
