import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from '../components/layout/AppShell';
import { OnboardingWizard } from '../features/onboarding/OnboardingWizard';
import { useAuthStore } from '../stores/auth.store';
import { useStateStore } from '../stores/state.store';
import type { UserState } from '../types/state';

const originalLoad = useStateStore.getState().load;

afterEach(() => {
  useStateStore.setState({ state: null, status: 'idle', load: originalLoad });
  useAuthStore.setState({ user: null, status: 'anonymous' });
});

describe('flujo de configuración inicial', () => {
  it('se abre automáticamente cuando la cuenta nunca ha completado la guía', () => {
    useStateStore.setState({ state: fixture(false), status: 'idle' });

    render(<OnboardingWizard />);

    expect(screen.getByRole('dialog', { name: 'Construyamos un plan que encaje contigo' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Cerrar configuración guiada sin guardar' })).toBeNull();
  });

  it('no reaparece tras completarse y puede abrirse desde el icono superior', async () => {
    const user = userEvent.setup();
    const completedState = fixture(true);
    useStateStore.setState({ state: completedState, status: 'idle', load: vi.fn(async () => undefined) });
    useAuthStore.setState({
      status: 'authenticated',
      user: { id: 'user', username: 'forjador', displayName: 'Usuario FORJA', createdAt: new Date().toISOString(), passkeys: [], passwordEnabled: true },
    });

    render(<MemoryRouter><AppShell /></MemoryRouter>);

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Perfil' })).toBeNull();
    expect(screen.getByText('Usuario FORJA').closest('a')?.getAttribute('href')).toBe('/profile');
    const mobileNavigation = screen.getByRole('navigation', { name: 'Navegación móvil' });
    expect(mobileNavigation.querySelectorAll('a')).toHaveLength(6);
    expect(mobileNavigation.textContent).toContain('Perfil');
    await user.click(screen.getByRole('button', { name: 'Reabrir configuración guiada' }));
    expect(screen.getByRole('dialog', { name: 'Actualicemos tus datos y tu plan' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Cerrar configuración guiada sin guardar' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(useStateStore.getState().state?.onboarding?.completedAt).toBe(completedState.onboarding?.completedAt);
  });

  it('expone el paso actual, los completados y la experiencia seleccionada', async () => {
    const user = userEvent.setup();
    const readyState = fixture(false);
    readyState.bodyMetrics.profile = { sex: 'male', ageYears: 32, heightCm: 178, activityLevel: 'moderate', goal: 'gain' };
    readyState.bodyWeight.entries = [{ id: 'initial-weight', measuredAt: new Date().toISOString(), weightKg: 80, note: null }];
    useStateStore.setState({ state: readyState, status: 'idle' });

    render(<OnboardingWizard />);

    const welcomeProgress = screen.getByText('Inicio').closest('li')!;
    expect(welcomeProgress.getAttribute('aria-current')).toBe('step');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(welcomeProgress.hasAttribute('aria-current')).toBe(false);
    expect(welcomeProgress.querySelector('.sr-only')?.textContent).toBe('Completado. ');
    expect(screen.getByText('Datos').closest('li')?.getAttribute('aria-current')).toBe('step');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(screen.getByText('Agenda').closest('li')?.getAttribute('aria-current')).toBe('step');
    expect(screen.getByRole('button', { name: 'Principiante' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Intermedio' }).getAttribute('aria-pressed')).toBe('false');
    await user.click(screen.getByRole('button', { name: 'Intermedio' }));
    expect(screen.getByRole('button', { name: 'Principiante' }).getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByRole('button', { name: 'Intermedio' }).getAttribute('aria-pressed')).toBe('true');
  });
});

function fixture(completed: boolean): UserState {
  const now = new Date().toISOString();
  const state: UserState = {
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
  if (completed) {
    state.onboarding = {
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
    };
  }
  return state;
}
