import { access } from 'node:fs/promises';
import { join } from 'node:path';
import type { User, UserState } from '../domain/models.js';
import { conflict, serviceUnavailable } from '../http/errors.js';
import { deepClone, Mutex, readJson, writeJsonAtomic } from '../utils/atomic-json.js';
import type { StateRepository } from './contracts.js';
import { createEmptyState, normalizeAndValidateState } from './user-state.document.js';

export class UserStateRepository implements StateRepository {
  private readonly mutexes = new Map<string, Mutex>();

  public constructor(private readonly dataDir: string) {}

  public async getOrCreate(user: User): Promise<UserState> {
    return this.mutexFor(user.stateFileKey).run(async () => {
      const path = this.pathFor(user.stateFileKey);
      try {
        await access(path);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw serviceUnavailable('No pudimos acceder al archivo de datos guardados');
        await writeJsonAtomic(path, createEmptyState(user));
      }
      let state: UserState;
      try { state = await readJson<UserState>(path); }
      catch { throw serviceUnavailable('No pudimos leer el archivo de datos. Se conserva sin cambios para su revisión.'); }
      const previousStateSignature = JSON.stringify(state);
      let normalized: UserState;
      try { normalized = normalizeAndValidateState(state, user); }
      catch { throw serviceUnavailable('Tus datos guardados necesitan una revisión. El archivo se conserva sin cambios.'); }
      const normalizedStateSignature = JSON.stringify(normalized);
      if (normalizedStateSignature !== previousStateSignature) {
        normalized.revision += 1;
        normalized.owner.updatedAt = new Date().toISOString();
        await writeJsonAtomic(path, normalized);
      }
      return deepClone(normalized);
    });
  }

  public async replace(user: User, candidate: unknown, expectedRevision: number | null): Promise<UserState> {
    return this.mutexFor(user.stateFileKey).run(async () => {
      const path = this.pathFor(user.stateFileKey);
      const current = await this.readOrCreateUnlocked(user, path);
      if (expectedRevision !== null && current.revision !== expectedRevision) {
        throw conflict(`State revision mismatch; current revision is ${current.revision}`);
      }
      const input = normalizeAndValidateState(deepClone(candidate) as UserState, user);
      // Notification subscriptions/timers are owned by their dedicated endpoints.
      // A stale offline snapshot must never resurrect cancelled server work.
      input.pushSubscriptions = current.pushSubscriptions;
      input.restTimers = current.restTimers;
      input.revision = current.revision + 1;
      input.owner.createdAt = current.owner.createdAt;
      input.owner.updatedAt = new Date().toISOString();
      input.owner.userId = user.id;
      input.owner.stateFileKey = user.stateFileKey;
      await writeJsonAtomic(path, input);
      return deepClone(input);
    });
  }

  public async mutate(user: User, operation: (state: UserState) => void): Promise<UserState> {
    return this.mutexFor(user.stateFileKey).run(async () => {
      const path = this.pathFor(user.stateFileKey);
      const state = await this.readOrCreateUnlocked(user, path);
      operation(state);
      state.revision += 1;
      state.owner.updatedAt = new Date().toISOString();
      normalizeAndValidateState(state, user);
      await writeJsonAtomic(path, state);
      return deepClone(state);
    });
  }

  private async readOrCreateUnlocked(user: User, path: string): Promise<UserState> {
    try {
      return await this.readValidated(user, path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      const state = createEmptyState(user);
      await writeJsonAtomic(path, state);
      return state;
    }
  }

  private async readValidated(user: User, path: string): Promise<UserState> {
    try { return normalizeAndValidateState(await readJson<UserState>(path), user); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw error;
      console.error(JSON.stringify({level:'error',event:'state_read_failed',userId:user.id,reason:error instanceof Error?error.message:'invalid state'}));
      throw serviceUnavailable('No pudimos leer tus datos guardados. El archivo se conserva sin cambios; solicita una revisión antes de continuar.');
    }
  }

  private pathFor(stateFileKey: string): string {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(stateFileKey)) {
      throw new Error('Unsafe state file key');
    }
    return join(this.dataDir, `state-${stateFileKey}.json`);
  }

  private mutexFor(key: string): Mutex {
    const existing = this.mutexes.get(key);
    if (existing) return existing;
    const mutex = new Mutex();
    this.mutexes.set(key, mutex);
    return mutex;
  }
}
