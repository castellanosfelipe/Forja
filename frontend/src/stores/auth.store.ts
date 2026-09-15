import { create } from 'zustand';
import { authApi } from '../api/auth.api';
import type { AuthUser } from '../types/auth';

const LAST_USER_KEY = 'forja:last-authenticated-user';
const LOGOUT_PENDING_KEY = 'forja:logout-pending';
let authGeneration = 0;
let logoutInFlight: Promise<void> | null = null;
let pendingInMemory = false;

interface AuthStore {
  user: AuthUser | null;
  status: 'loading' | 'authenticated' | 'anonymous';
  notice: string | null;
  logoutPending: boolean;
  initialize(): Promise<void>;
  prepareSignIn(): Promise<void>;
  setUser(user: AuthUser): void;
  logout(): Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  status: 'loading',
  notice: null,
  logoutPending: false,
  async initialize() {
    const ticket = ++authGeneration;
    if (isLogoutPending()) {
      set({ user: null, status: 'anonymous', logoutPending: true });
      try {
        await revokePendingSession();
        if (ticket === authGeneration) set({ notice: null, logoutPending: false });
      } catch {
        if (ticket === authGeneration) set({ notice: 'El acceso está cerrado en este dispositivo. Vuelve a conectarte para terminar de cerrar tu sesión en tu cuenta.', logoutPending: true });
      }
      return;
    }
    try {
      const session = await authApi.session();
      if (ticket !== authGeneration || isLogoutPending()) return;
      if (session.authenticated) {
        cacheUser(session.user);
        set({ user: session.user, status: 'authenticated', notice: null, logoutPending: false });
      } else {
        clearCachedUser();
        set({ user: null, status: 'anonymous' });
      }
    } catch {
      if (ticket !== authGeneration || isLogoutPending()) return;
      const cachedUser = navigator.onLine ? null : readCachedUser();
      set(cachedUser
        ? { user: cachedUser, status: 'authenticated' }
        : { user: null, status: 'anonymous' });
    }
  },
  async prepareSignIn() {
    if (!isLogoutPending()) return;
    try {
      await revokePendingSession();
      set({ notice: null, logoutPending: false });
    } catch {
      throw new Error('Vuelve a conectarte para terminar de cerrar la sesión anterior antes de entrar.');
    }
  },
  setUser(user) {
    authGeneration += 1;
    markLogoutPending(false);
    cacheUser(user);
    set({ user, status: 'authenticated', notice: null, logoutPending: false });
  },
  async logout() {
    authGeneration += 1;
    markLogoutPending(true);
    clearCachedUser();
    set({ user: null, status: 'anonymous', logoutPending: true, notice: null });
    try {
      await revokePendingSession();
      set({ logoutPending: false, notice: null });
    } catch {
      set({ notice: 'El acceso está cerrado en este dispositivo. Vuelve a conectarte para terminar de cerrar tu sesión en tu cuenta.', logoutPending: true });
    }
  },
}));

function isLogoutPending(): boolean {
  try { return pendingInMemory || localStorage.getItem(LOGOUT_PENDING_KEY) === '1'; }
  catch { return pendingInMemory; }
}

function markLogoutPending(value: boolean): void {
  pendingInMemory = value;
  try {
    if (value) localStorage.setItem(LOGOUT_PENDING_KEY, '1');
    else localStorage.removeItem(LOGOUT_PENDING_KEY);
  } catch { /* The in-memory intent still prevents access until this page closes. */ }
}

function revokePendingSession(): Promise<void> {
  logoutInFlight ??= authApi.logout().then(() => markLogoutPending(false)).finally(() => { logoutInFlight = null; });
  return logoutInFlight;
}

function cacheUser(user: AuthUser): void {
  try { localStorage.setItem(LAST_USER_KEY, JSON.stringify(user)); } catch { /* Storage can be unavailable in private contexts. */ }
}

function clearCachedUser(): void {
  try { localStorage.removeItem(LAST_USER_KEY); } catch { /* No persistent storage available. */ }
}

function readCachedUser(): AuthUser | null {
  try {
    const value = JSON.parse(localStorage.getItem(LAST_USER_KEY) ?? 'null') as Partial<AuthUser> | null;
    if (!value || typeof value.id !== 'string' || typeof value.username !== 'string' || typeof value.displayName !== 'string' || !Array.isArray(value.passkeys)) return null;
    return value as AuthUser;
  } catch {
    return null;
  }
}
