import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authApi } from '../api/auth.api';
import { ProfilePage } from '../features/profile/ProfilePage';
import { useAuthStore } from '../stores/auth.store';
import { useStateStore } from '../stores/state.store';
import type { UserState } from '../types/state';

const originalLogout = useAuthStore.getState().logout;
const originalReset = useStateStore.getState().reset;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useAuthStore.setState({ user: null, status: 'anonymous', logout: originalLogout });
  useStateStore.setState({ state: null, status: 'idle', error: null, hasPendingChanges: false, reset: originalReset });
});

describe('ProfilePage feedback and pending changes', () => {
  it('requires explicit confirmation before discarding unsynchronized changes on sign out', async () => {
    const user = userEvent.setup();
    const logout = vi.fn(async () => undefined);
    const reset = vi.fn();
    prepareStores({ status: 'conflict', hasPendingChanges: true, logout, reset });

    render(<ProfilePage />);

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(screen.getByRole('alertdialog', { name: '¿Cerrar sesión y descartar cambios?' })).toBeTruthy();
    expect(screen.getByText(/conflicto de sincronización/i)).toBeTruthy();
    expect(reset).not.toHaveBeenCalled();
    expect(logout).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Conservar' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(reset).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    await user.click(screen.getByRole('button', { name: 'Cerrar y descartar' }));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('presents failed profile actions as an alert instead of a success notice', async () => {
    const user = userEvent.setup();
    prepareStores();
    vi.spyOn(authApi, 'addPasskey').mockRejectedValueOnce(new Error('Biometría no disponible.'));

    render(<ProfilePage />);
    await user.click(screen.getByRole('button', { name: 'Añadir Passkey' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Biometría no disponible.');
    expect(alert.className).toContain('error-banner');
    expect(document.querySelector('.notice-banner')).toBeNull();
  });
});

function prepareStores(options: {
  status?: ReturnType<typeof useStateStore.getState>['status'];
  hasPendingChanges?: boolean;
  logout?: () => Promise<void>;
  reset?: () => void;
} = {}) {
  const now = new Date().toISOString();
  useAuthStore.setState({
    status: 'authenticated',
    user: { id: 'user', username: 'forjador', displayName: 'Usuario FORJA', createdAt: now, passkeys: [], passwordEnabled: true },
    logout: options.logout ?? vi.fn(async () => undefined),
  });
  useStateStore.setState({
    state: fixture(now),
    status: options.status ?? 'idle',
    error: null,
    hasPendingChanges: options.hasPendingChanges ?? false,
    reset: options.reset ?? vi.fn(),
  });
}

function fixture(now: string): UserState {
  return {
    schemaVersion: 1,
    revision: 1,
    owner: { userId: 'user', stateFileKey: 'user', createdAt: now, updatedAt: now },
    preferences: { locale: 'es' },
    bodyWeight: { goal: null, entries: [] },
    bodyMetrics: { profile: { sex: null, ageYears: null, heightCm: null, activityLevel: 'moderate', goal: 'maintain' }, entries: [] },
    exerciseLibrary: [],
    weeklyPlan: { id: 'plan', name: 'Plan', effectiveFrom: now.slice(0, 10), days: [] },
    scheduleOverrides: [],
    workoutSessions: [],
    progression: { exerciseRules: [] },
    pushSubscriptions: [],
    restTimers: [],
  };
}
