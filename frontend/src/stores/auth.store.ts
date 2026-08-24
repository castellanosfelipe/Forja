import { create } from 'zustand';
import { authApi } from '../api/auth.api';
import type { AuthUser } from '../types/auth';

const LAST_USER_KEY = 'forja:last-authenticated-user';

interface AuthStore {
  user: AuthUser | null;
  status: 'loading' | 'authenticated' | 'anonymous';
  initialize(): Promise<void>;
  setUser(user: AuthUser): void;
  logout(): Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  status: 'loading',
  async initialize() {
    try {
      const session = await authApi.session();
      if (session.authenticated) {
        cacheUser(session.user);
        set({ user: session.user, status: 'authenticated' });
      } else {
        clearCachedUser();
        set({ user: null, status: 'anonymous' });
      }
    } catch {
      const cachedUser = navigator.onLine ? null : readCachedUser();
      set(cachedUser
        ? { user: cachedUser, status: 'authenticated' }
        : { user: null, status: 'anonymous' });
    }
  },
  setUser(user) {
    cacheUser(user);
    set({ user, status: 'authenticated' });
  },
  async logout() {
    try {
      await authApi.logout();
    } finally {
      clearCachedUser();
      set({ user: null, status: 'anonymous' });
    }
  },
}));

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
