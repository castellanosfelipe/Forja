import { create } from 'zustand';
import { ApiError } from '../api/client';
import { stateApi } from '../api/state.api';
import { deleteOfflineValue, readOfflineValue, writeOfflineValue } from '../pwa/offline-db';
import type { SyncStatus, UserState } from '../types/state';
import { userFacingError } from '../utils/user-facing-error';
import { useAuthStore } from './auth.store';

function offlineKeys() {
  const userId = useAuthStore.getState().user?.id ?? 'anonymous';
  return {
    base: `server-state:${userId}`,
    cache: `cached-state:${userId}`,
    pending: `pending-state:${userId}`,
  };
}

let operationQueue: Promise<void> = Promise.resolve();

function serialize(operation: () => Promise<void>): Promise<void> {
  const result = operationQueue.catch(() => undefined).then(operation);
  operationQueue = result.catch(() => undefined);
  return result;
}

interface StateStore {
  state: UserState | null;
  status: SyncStatus;
  error: string | null;
  hasPendingChanges: boolean;
  load(): Promise<void>;
  refresh(options?: { discardPending?: boolean }): Promise<void>;
  update(mutator: (state: UserState) => void): Promise<void>;
  flush(): Promise<void>;
  clearError(): void;
  reset(): void;
}

export const useStateStore = create<StateStore>((set, get) => ({
  state: null,
  status: 'idle',
  error: null,
  hasPendingChanges: false,

  async load() {
    return serialize(async () => {
    set({ status: 'loading', error: null });
    const keys = offlineKeys();
    const cached = await readOfflineValue<UserState>(keys.cache).catch(() => null);
    if (cached) set({ state: cached });
    try {
      const remote = await stateApi.get();
      await Promise.all([
        writeOfflineValue(keys.base, remote),
        writeOfflineValue(keys.cache, remote),
      ]);
      const pending = await readOfflineValue<UserState>(keys.pending);
      if (pending) {
        set({ state: pending, status: 'offline', hasPendingChanges: true });
        await flushPending(keys, set, get);
      } else {
        set({ state: remote, status: 'idle', hasPendingChanges: false });
      }
    } catch (cause) {
      if (cached) {
        set({ status: 'offline', error: 'No tienes conexión. Puedes seguir usando FORJA y guardaremos tus cambios cuando vuelvas.' });
      } else {
        set({ status: 'error', error: errorMessage(cause) });
      }
    }
    });
  },

  async refresh(options = {}) {
    return serialize(async () => {
    const keys = offlineKeys();
    const pending = await readOfflineValue<UserState>(keys.pending).catch(() => null);
    if (!options.discardPending && (get().hasPendingChanges || pending)) {
      throw new Error('Aún hay cambios por guardar en tu cuenta. Espera a que terminen o guarda una copia antes de continuar.');
    }
    const remote = await stateApi.get();
    await Promise.all([
      writeOfflineValue(keys.base, remote),
      writeOfflineValue(keys.cache, remote),
      deleteOfflineValue(keys.pending),
    ]);
    set({ state: remote, status: 'idle', error: null, hasPendingChanges: false });
    });
  },

  async update(mutator) {
    return serialize(async () => {
      const keys = offlineKeys();
      const current = get().state;
      if (!current) return;
      const draft = structuredClone(current);
      mutator(draft);
      draft.owner.updatedAt = new Date().toISOString();

      // Update memory before the asynchronous IndexedDB writes. Subsequent queued
      // mutations will always clone this latest snapshot instead of an older one.
      set({
        state: draft,
        error: null,
        hasPendingChanges: true,
        status: navigator.onLine ? 'syncing' : 'offline',
      });
      await Promise.all([
        writeOfflineValue(keys.cache, draft),
        writeOfflineValue(keys.pending, draft),
      ]);
      if (navigator.onLine) await flushPending(keys, set, get);
    });
  },

  async flush() {
    return serialize(() => flushPending(offlineKeys(), set, get));
  },

  clearError() { set({ error: null }); },
  reset() {
    const keys = offlineKeys();
    void Promise.all([
      deleteOfflineValue(keys.base),
      deleteOfflineValue(keys.cache),
      deleteOfflineValue(keys.pending),
    ]);
    set({ state: null, status: 'idle', error: null, hasPendingChanges: false });
  },
}));

type StoreSetter = (partial: Partial<StateStore>) => void;
type StoreGetter = () => StateStore;
type OfflineKeys = ReturnType<typeof offlineKeys>;

async function flushPending(keys: OfflineKeys, set: StoreSetter, get: StoreGetter): Promise<void> {
  let pending = await readOfflineValue<UserState>(keys.pending);
  if (!pending || !navigator.onLine) return;

  set({ status: 'syncing', error: null });
  try {
    const saved = await stateApi.replace(pending);
    await acceptSavedState(keys, saved, set);
    return;
  } catch (cause) {
    if (!(cause instanceof ApiError) || cause.status !== 409) {
      setSyncFailure(cause, set);
      return;
    }
  }

  try {
    const [remote, base] = await Promise.all([
      stateApi.get(),
      readOfflineValue<UserState>(keys.base).catch(() => null),
    ]);
    const rebased = rebasePendingState(base, pending, remote);
    if (!rebased) {
      set({
        status: 'conflict',
        error: 'Tus cambios y los de otro dispositivo no coinciden. Nada se ha borrado: guarda una copia o elige qué información conservar.',
        hasPendingChanges: true,
      });
      return;
    }

    pending = rebased;
    await Promise.all([
      writeOfflineValue(keys.base, remote),
      writeOfflineValue(keys.cache, pending),
      writeOfflineValue(keys.pending, pending),
    ]);
    set({ state: pending, status: 'syncing', hasPendingChanges: true });
    const saved = await stateApi.replace(pending);
    await acceptSavedState(keys, saved, set);
  } catch (cause) {
    if (cause instanceof ApiError && cause.status === 409) {
      set({
        status: 'conflict',
        error: 'Tu información cambió otra vez en otro dispositivo. Tus cambios siguen a salvo aquí.',
        hasPendingChanges: true,
      });
      return;
    }
    setSyncFailure(cause, set);
  }
}

async function acceptSavedState(keys: OfflineKeys, saved: UserState, set: StoreSetter): Promise<void> {
  await Promise.all([
    writeOfflineValue(keys.base, saved),
    writeOfflineValue(keys.cache, saved),
    deleteOfflineValue(keys.pending),
  ]);
  set({ state: saved, status: 'idle', error: null, hasPendingChanges: false });
}

function setSyncFailure(cause: unknown, set: StoreSetter): void {
  if (cause instanceof ApiError && cause.status === 401) {
    set({
      status: 'error',
      error: 'Por seguridad, vuelve a iniciar sesión. Tus cambios siguen a salvo en este dispositivo y se guardarán en tu cuenta cuando entres.',
      hasPendingChanges: true,
    });
    return;
  }
  if (cause instanceof ApiError && cause.status === 413) {
    set({
      status: 'error',
      error: 'Has alcanzado el límite de información que puede guardarse en tu cuenta. Tus cambios siguen a salvo aquí; guarda una copia antes de continuar.',
      hasPendingChanges: true,
    });
    return;
  }
  set({
    status: 'offline',
    error: 'Sin conexión. Tus cambios siguen a salvo y se guardarán cuando vuelvas a conectarte.',
    hasPendingChanges: true,
  });
}

/**
 * Three-way top-level merge. Server-owned Push collections always come from
 * the server; user-owned fields are merged only when one side changed them.
 * If both sides changed the same field differently, no data is discarded.
 */
export function rebasePendingState(
  base: UserState | null,
  pending: UserState,
  remote: UserState,
): UserState | null {
  if (!base) {
    return equalClientState(pending, remote)
      ? { ...structuredClone(remote), owner: structuredClone(remote.owner), revision: remote.revision }
      : null;
  }

  const result = structuredClone(remote) as UserState & Record<string, unknown>;
  const baseRecord = base as UserState & Record<string, unknown>;
  const pendingRecord = pending as UserState & Record<string, unknown>;
  const remoteRecord = remote as UserState & Record<string, unknown>;
  const serverOwned = new Set(['schemaVersion', 'revision', 'owner', 'pushSubscriptions', 'restTimers']);
  const keys = new Set([...Object.keys(baseRecord), ...Object.keys(pendingRecord), ...Object.keys(remoteRecord)]);

  for (const key of keys) {
    if (serverOwned.has(key)) continue;
    const localChanged = !deepEqual(pendingRecord[key], baseRecord[key]);
    const remoteChanged = !deepEqual(remoteRecord[key], baseRecord[key]);
    if (localChanged && remoteChanged && !deepEqual(pendingRecord[key], remoteRecord[key])) return null;
    if (localChanged) result[key] = structuredClone(pendingRecord[key]);
  }
  result.revision = remote.revision;
  result.owner = structuredClone(remote.owner);
  result.pushSubscriptions = structuredClone(remote.pushSubscriptions);
  result.restTimers = structuredClone(remote.restTimers);
  return result;
}

function equalClientState(left: UserState, right: UserState): boolean {
  const omitServerOwned = (state: UserState) => {
    const copy = structuredClone(state) as UserState & Record<string, unknown>;
    const record = copy as Record<string, unknown>;
    delete record.revision;
    delete record.owner;
    delete record.pushSubscriptions;
    delete record.restTimers;
    return copy;
  };
  return deepEqual(omitServerOwned(left), omitServerOwned(right));
}

function deepEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function errorMessage(cause: unknown): string {
  return userFacingError(cause, 'No pudimos cargar tus datos. Revisa tu conexión e inténtalo de nuevo.');
}
