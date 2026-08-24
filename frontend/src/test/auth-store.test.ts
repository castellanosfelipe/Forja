import { afterEach, describe, expect, it, vi } from 'vitest';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../stores/auth.store';
import type { AuthUser } from '../types/auth';

const onlineDescriptor = Object.getOwnPropertyDescriptor(navigator, 'onLine');

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  useAuthStore.setState({ user: null, status: 'anonymous' });
  if (onlineDescriptor) Object.defineProperty(navigator, 'onLine', onlineDescriptor);
});

describe('offline authentication continuity', () => {
  it('uses the last verified identity only when the session endpoint is unreachable offline', async () => {
    const user = fixtureUser();
    useAuthStore.getState().setUser(user);
    useAuthStore.setState({ user: null, status: 'loading' });
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    vi.spyOn(authApi, 'session').mockRejectedValueOnce(new Error('Sin red'));

    await useAuthStore.getState().initialize();

    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(useAuthStore.getState().user?.id).toBe(user.id);
  });

  it('does not trust the cached identity when the server reports an anonymous session', async () => {
    useAuthStore.getState().setUser(fixtureUser());
    useAuthStore.setState({ user: null, status: 'loading' });
    vi.spyOn(authApi, 'session').mockResolvedValueOnce({ authenticated: false, user: null });

    await useAuthStore.getState().initialize();

    expect(useAuthStore.getState().status).toBe('anonymous');
    expect(useAuthStore.getState().user).toBeNull();
    expect(localStorage.getItem('forja:last-authenticated-user')).toBeNull();
  });
});

function fixtureUser(): AuthUser {
  return {
    id: 'user',
    username: 'forjador',
    displayName: 'Usuario FORJA',
    createdAt: '2026-08-24T12:00:00.000Z',
    passkeys: [],
    passwordEnabled: true,
  };
}
