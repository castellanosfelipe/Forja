import { create } from 'zustand';
import { ApiError } from '../api/client';
import { stateApi } from '../api/state.api';
import { changeOfflineValues, readOfflineValue } from '../pwa/offline-db';
import type { SyncStatus, UserState } from '../types/state';
import { userFacingError } from '../utils/user-facing-error';
import { useAuthStore } from './auth.store';

let generation = 0;
let operationQueue: Promise<void> = Promise.resolve();
let persistenceQueue: Promise<void> = Promise.resolve();

function context() {
  const userId = useAuthStore.getState().user?.id ?? null;
  return { userId, generation, base: `server-state:${userId}`, cache: `cached-state:${userId}`, pending: `pending-state:${userId}` };
}
type Context = ReturnType<typeof context>;
function current(ctx: Context): boolean {
  return ctx.userId !== null && ctx.generation === generation && useAuthStore.getState().user?.id === ctx.userId;
}
function owned(value: UserState | null, ctx: Context): UserState | null {
  return value?.owner?.userId === ctx.userId ? value : null;
}
function serialize(ctx: Context, operation: () => Promise<void>): Promise<void> {
  const result = operationQueue.catch(() => undefined).then(async () => { if (current(ctx)) await operation(); });
  operationQueue = result.catch(() => undefined);
  return result;
}
function persist(ctx: Context, operation: () => Promise<unknown>): Promise<void> {
  const result = persistenceQueue.catch(() => undefined).then(async () => { if (current(ctx)) await operation(); });
  persistenceQueue = result.catch(() => undefined);
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
  reset(): Promise<void>;
}
type StoreSetter = (partial: Partial<StateStore>) => void;
type StoreGetter = () => StateStore;
const empty = { state: null, status: 'idle' as const, error: null, hasPendingChanges: false };

export const useStateStore = create<StateStore>((set, get) => ({
  ...empty,
  load() {
    const ctx = context();
    return serialize(ctx, async () => {
      set({ status: 'loading', error: null });
      let cached: UserState | null;
      let storedPending: UserState | null;
      try {
        [cached, storedPending] = await Promise.all([
          readOfflineValue<UserState>(ctx.cache),
          readOfflineValue<UserState>(ctx.pending),
        ]);
      } catch {
        if (current(ctx)) set({ status: 'error', error: 'No pudimos leer tus datos guardados en este dispositivo. Cierra otras pestañas de FORJA y vuelve a intentarlo. No se ha reemplazado ninguna copia.' });
        return;
      }
      if (!current(ctx)) return;
      const pending = (get().hasPendingChanges ? owned(get().state, ctx) : null) ?? owned(storedPending, ctx);
      const local = pending ?? owned(cached, ctx);
      if (local) set({ state: local, hasPendingChanges: Boolean(pending) });
      let remote: UserState;
      try { remote = await stateApi.get(); }
      catch (cause) {
        if (!current(ctx)) return;
        set({
          status: local ? 'offline' : 'error',
          hasPendingChanges: Boolean(pending),
          error: local ? 'No tienes conexión. Puedes seguir usando FORJA y guardaremos tus cambios cuando vuelvas.' : errorMessage(cause),
        });
        return;
      }
      if (!current(ctx)) return;
      if (pending) {
        // Preserve the base belonging to the pending draft until reconciliation succeeds.
        set({ state: pending, status: 'offline', hasPendingChanges: true });
        await flushPending(ctx, set, get);
      } else {
        set({ state: remote, status: 'idle', error: null, hasPendingChanges: false });
        try { await persist(ctx, () => changeOfflineValues([[ctx.base, remote], [ctx.cache, remote]])); }
        catch { if (current(ctx)) set({ status: 'error', error: 'Tus datos están en tu cuenta, pero no pudimos guardar una copia en este dispositivo. Revisa el espacio disponible.' }); }
      }
    });
  },
  refresh(options = {}) {
    const ctx = context();
    return serialize(ctx, async () => {
      const pending = await readOfflineValue<UserState>(ctx.pending);
      if (!current(ctx)) return;
      if (!options.discardPending && (get().hasPendingChanges || pending)) {
        throw new Error('Aún hay cambios por guardar en tu cuenta. Espera a que terminen o guarda una copia antes de continuar.');
      }
      const remote = await stateApi.get();
      if (!current(ctx)) return;
      await acceptSavedState(ctx, remote, set);
    });
  },
  update(mutator) {
    const ctx = context();
    return serialize(ctx, async () => {
      const previous = owned(get().state, ctx);
      if (!previous) return;
      const draft = structuredClone(previous);
      mutator(draft);
      draft.owner.updatedAt = new Date().toISOString();
      set({ state: draft, error: null, hasPendingChanges: true, status: navigator.onLine ? 'syncing' : 'offline' });
      try {
        await persist(ctx, () => changeOfflineValues([[ctx.cache, draft], [ctx.pending, draft]]));
      } catch {
        if (current(ctx)) setStorageFailure(set);
        return;
      }
      if (current(ctx) && navigator.onLine) await flushPending(ctx, set, get);
    });
  },
  flush() {
    const ctx = context();
    return serialize(ctx, () => flushPending(ctx, set, get));
  },
  clearError() { set({ error: null }); },
  reset() {
    const ctx = context();
    generation += 1;
    operationQueue = Promise.resolve();
    set(empty);
    // Queue deletion behind writes already underway. Stale operations cannot enqueue new writes.
    const cleanup = persistenceQueue.catch(() => undefined).then(async () => {
      if (!ctx.userId) return;
      await changeOfflineValues([], [ctx.base, ctx.cache, ctx.pending]);
    });
    persistenceQueue = cleanup.catch(() => undefined);
    return cleanup;
  },
}));

// Changing accounts clears visible state immediately but preserves an expired session's pending draft.
useAuthStore.subscribe((next, previous) => {
  if (next.user?.id === previous.user?.id) return;
  generation += 1;
  operationQueue = Promise.resolve();
  useStateStore.setState(empty);
});

async function flushPending(ctx: Context, set: StoreSetter, get: StoreGetter): Promise<void> {
  if (!current(ctx) || !navigator.onLine) return;
  let pending = get().hasPendingChanges ? owned(get().state, ctx) : null;
  try { pending ??= owned(await readOfflineValue<UserState>(ctx.pending), ctx); }
  catch { if (current(ctx)) setStorageFailure(set); return; }
  if (!pending || !current(ctx)) return;
  set({ status: 'syncing', error: null, hasPendingChanges: true });
  try {
    // Also retries drafts that could previously be stored only in memory.
    await persist(ctx, () => changeOfflineValues([[ctx.cache, pending], [ctx.pending, pending]]));
  } catch { if (current(ctx)) setStorageFailure(set); return; }
  if (!current(ctx)) return;
  try {
    const saved = await stateApi.replace(pending);
    if (current(ctx)) await acceptSavedState(ctx, saved, set);
    return;
  } catch (cause) {
    if (!current(ctx)) return;
    if (!(cause instanceof ApiError) || cause.status !== 409) { setSyncFailure(cause, set); return; }
  }
  try {
    const [remote, base] = await Promise.all([stateApi.get(), readOfflineValue<UserState>(ctx.base).catch(() => null)]);
    if (!current(ctx)) return;
    const rebased = rebasePendingState(owned(base, ctx), pending, remote);
    if (!rebased) {
      set({ status: 'conflict', error: 'Tus cambios y los de otro dispositivo no coinciden. Nada se ha borrado: guarda una copia o elige qué información conservar.', hasPendingChanges: true });
      return;
    }
    pending = rebased;
    try { await persist(ctx, () => changeOfflineValues([[ctx.base, remote], [ctx.cache, pending], [ctx.pending, pending]])); }
    catch { if (current(ctx)) setStorageFailure(set); return; }
    if (!current(ctx)) return;
    set({ state: pending, status: 'syncing', hasPendingChanges: true });
    const saved = await stateApi.replace(pending);
    if (current(ctx)) await acceptSavedState(ctx, saved, set);
  } catch (cause) {
    if (!current(ctx)) return;
    if (cause instanceof ApiError && cause.status === 409) {
      set({ status: 'conflict', error: 'Tu información cambió otra vez en otro dispositivo. Tus cambios siguen a salvo aquí.', hasPendingChanges: true });
    } else setSyncFailure(cause, set);
  }
}
async function acceptSavedState(ctx: Context, saved: UserState, set: StoreSetter): Promise<void> {
  try { await persist(ctx, () => changeOfflineValues([[ctx.base, saved], [ctx.cache, saved]], [ctx.pending])); }
  catch { if (current(ctx)) setStorageFailure(set); return; }
  if (current(ctx)) set({ state: saved, status: 'idle', error: null, hasPendingChanges: false });
}
function setStorageFailure(set: StoreSetter): void {
  set({ status: 'error', error: 'No pudimos guardar tus cambios en este dispositivo. Siguen abiertos aquí: guarda una copia antes de cerrar o recargar y libera espacio para volver a intentarlo.', hasPendingChanges: true });
}
function setSyncFailure(cause: unknown, set: StoreSetter): void {
  if (cause instanceof ApiError && cause.status === 401) {
    set({ status: 'error', error: 'Por seguridad, vuelve a iniciar sesión. Tus cambios siguen a salvo en este dispositivo y se guardarán en tu cuenta cuando entres.', hasPendingChanges: true });
    return;
  }
  if (cause instanceof ApiError && cause.status === 413) {
    set({ status: 'error', error: 'Has alcanzado el límite de información que puede guardarse en tu cuenta. Tus cambios siguen a salvo aquí; guarda una copia antes de continuar.', hasPendingChanges: true });
    return;
  }
  if (cause instanceof ApiError && cause.status >= 400 && cause.status < 500) {
    set({ status: 'error', error: 'No pudimos guardar estos cambios. Guarda una copia y revisa los datos antes de volver a intentarlo.', hasPendingChanges: true });
    return;
  }
  set({ status: 'offline', error: 'Sin conexión. Tus cambios siguen a salvo y se guardarán cuando vuelvas a conectarte.', hasPendingChanges: true });
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
