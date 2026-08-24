import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from '../components/layout/AppShell';
import { useAuthStore } from '../stores/auth.store';
import { useStateStore } from '../stores/state.store';
import type { UserState } from '../types/state';

const original = {
  load: useStateStore.getState().load,
  flush: useStateStore.getState().flush,
  refresh: useStateStore.getState().refresh,
};

afterEach(() => {
  useStateStore.setState({
    state: null,
    status: 'idle',
    error: null,
    hasPendingChanges: false,
    ...original,
  });
  useAuthStore.setState({ user: null, status: 'anonymous' });
  document.title = '';
});

describe('AppShell recovery and conflict protection', () => {
  it('shows a recoverable error instead of a blank route when initial state loading fails', async () => {
    const user = userEvent.setup();
    const load = vi.fn(async () => undefined);
    prepareAuth();
    useStateStore.setState({ state: null, status: 'error', error: 'Servidor no disponible.', load });

    render(<MemoryRouter><AppShell /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'No pudimos cargar tus datos' })).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain('Servidor no disponible.');
    await user.click(screen.getByRole('button', { name: 'Intentar de nuevo' }));
    expect(load).toHaveBeenCalled();
  });

  it('requires confirmation before replacing pending local data with the server version', async () => {
    const user = userEvent.setup();
    const refresh = vi.fn(async () => undefined);
    prepareAuth();
    useStateStore.setState({
      state: fixture(),
      status: 'conflict',
      error: 'Otro dispositivo cambió los mismos datos.',
      hasPendingChanges: true,
      load: vi.fn(async () => undefined),
      refresh,
      flush: vi.fn(async () => undefined),
    });

    render(<MemoryRouter><AppShell /></MemoryRouter>);

    await user.click(screen.getByRole('button', { name: 'Usar versión del servidor' }));
    expect(screen.getByRole('alertdialog', { name: '¿Reemplazar la copia local?' })).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Conservar' }));
    expect(refresh).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Usar versión del servidor' }));
    await user.click(screen.getByRole('button', { name: 'Descartar y usar servidor' }));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });

  it('does not label an unknown route as the summary page', async () => {
    prepareAuth();
    useStateStore.setState({
      state: fixture(),
      status: 'idle',
      load: vi.fn(async () => undefined),
      refresh: vi.fn(async () => undefined),
      flush: vi.fn(async () => undefined),
    });

    render(<MemoryRouter initialEntries={['/ruta-inexistente']}><AppShell /></MemoryRouter>);

    await waitFor(() => expect(document.title).toBe('Página no encontrada · FORJA'));
  });
});

function prepareAuth() {
  const now = new Date().toISOString();
  useAuthStore.setState({
    status: 'authenticated',
    user: { id: 'user', username: 'forjador', displayName: 'Usuario FORJA', createdAt: now, passkeys: [], passwordEnabled: true },
  });
}

function fixture(): UserState {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    revision: 1,
    owner: { userId: 'user', stateFileKey: 'user', createdAt: now, updatedAt: now },
    preferences: { locale: 'es' },
    bodyWeight: { goal: null, entries: [] },
    bodyMetrics: { profile: { sex: 'male', ageYears: 30, heightCm: 175, activityLevel: 'moderate', goal: 'maintain' }, entries: [] },
    exerciseLibrary: [],
    weeklyPlan: { id: 'plan', name: 'Plan', effectiveFrom: now.slice(0, 10), days: [] },
    scheduleOverrides: [],
    workoutSessions: [],
    progression: { exerciseRules: [] },
    pushSubscriptions: [],
    restTimers: [],
    onboarding: {
      completedAt: now,
      trainingGoal: 'hypertrophy',
      experience: 'beginner',
      trainingDaysPerWeek: 3,
      sessionMinutes: 60,
      equipment: 'full-gym',
      priorityMuscles: [],
      limitations: [],
      generatedAt: now,
      methodologyVersion: 'forja-safe-v1',
    },
  };
}
