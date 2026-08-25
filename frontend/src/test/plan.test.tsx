import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatRestDuration, nextDateForWeekday, PlanPage } from '../features/planning/PlanPage';
import { useStateStore } from '../stores/state.store';
import type { UserState } from '../types/state';

const originalUpdate = useStateStore.getState().update;

afterEach(() => {
  vi.useRealTimers();
  useStateStore.setState({
    state: null,
    status: 'idle',
    error: null,
    hasPendingChanges: false,
    update: originalUpdate,
  });
});

describe('PlanPage interaction and scheduling', () => {
  it('formats every rest interval without rounding away seconds', () => {
    expect(formatRestDuration(0)).toBe('sin descanso');
    expect(formatRestDuration(30)).toBe('30 s');
    expect(formatRestDuration(90)).toBe('1 min 30 s');
    expect(formatRestDuration(120)).toBe('2 min');

    prepare(fixture(true));
    render(<PlanPage />);
    expect(screen.getByText(/1 min 30 s de descanso/)).toBeTruthy();
  });

  it('aligns the original date and moves focus to the rescheduling form', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-08-26T12:00:00'));
    prepare(fixture(true));
    render(<PlanPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Reprogramar Lunes · Día A' }));

    expect(screen.getByRole('heading', { name: 'Mover una sesión' })).toBe(document.activeElement);
    expect(screen.getByRole('combobox', { name: 'Día del plan' })).toHaveProperty('value', 'day-a');
    expect(screen.getByLabelText('Fecha original')).toHaveProperty('value', '2026-08-31');
    expect(screen.getByLabelText('Nueva fecha')).toHaveProperty('value', '2026-09-01');
    expect(nextDateForWeekday(1, new Date('2026-08-26T12:00:00'))).toBe('2026-08-31');
  });

  it('turns the empty state into a direct path to the exercise selector', async () => {
    const user = userEvent.setup();
    prepare(fixture(false));
    render(<PlanPage />);

    await user.click(screen.getByRole('button', { name: 'Añadir primer ejercicio' }));

    expect(screen.getByRole('combobox', { name: 'Ejercicio' })).toBe(document.activeElement);
  });

  it('disables both forms while saving and prevents duplicate submissions', async () => {
    const user = userEvent.setup();
    let finish!: () => void;
    const saving = new Promise<void>((resolve) => { finish = resolve; });
    const update = vi.fn(() => saving) as unknown as ReturnType<typeof useStateStore.getState>['update'];
    prepare(fixture(false), update);
    render(<PlanPage />);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Ejercicio' }), 'bench-press');
    await user.click(screen.getByRole('button', { name: 'Añadir al plan' }));

    const savingButton = screen.getByRole('button', { name: 'Añadiendo…' });
    expect(savingButton).toHaveProperty('disabled', true);
    expect(screen.getByRole('combobox', { name: 'Día del plan' }).matches(':disabled')).toBe(true);
    fireEvent.click(savingButton);
    expect(update).toHaveBeenCalledTimes(1);

    await act(async () => finish());
    expect((await screen.findByRole('status')).textContent).toContain('Ejercicio añadido al plan semanal.');
  });

  it('shows an actionable error and restores controls when saving fails', async () => {
    const user = userEvent.setup();
    const update = vi.fn(async () => { throw new Error('Almacenamiento no disponible.'); }) as unknown as ReturnType<typeof useStateStore.getState>['update'];
    prepare(fixture(false), update);
    render(<PlanPage />);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Ejercicio' }), 'bench-press');
    await user.click(screen.getByRole('button', { name: 'Añadir al plan' }));

    expect((await screen.findByRole('alert')).textContent).toContain('No pudimos añadir el ejercicio al plan.');
    expect(screen.getByRole('alert').textContent).not.toContain('Almacenamiento');
    expect(screen.getByRole('button', { name: 'Añadir al plan' })).toHaveProperty('disabled', false);
  });
});

function prepare(state: UserState, update = vi.fn(async () => undefined) as unknown as ReturnType<typeof useStateStore.getState>['update']) {
  useStateStore.setState({ state, status: 'idle', error: null, hasPendingChanges: false, update });
}

function fixture(withPlan: boolean): UserState {
  const now = '2026-08-24T12:00:00.000Z';
  return {
    schemaVersion: 1,
    revision: 1,
    owner: { userId: 'user', stateFileKey: 'user', createdAt: now, updatedAt: now },
    preferences: { locale: 'es' },
    bodyWeight: { goal: null, entries: [] },
    bodyMetrics: { profile: { sex: null, ageYears: null, heightCm: null, activityLevel: 'moderate', goal: 'maintain' }, entries: [] },
    exerciseLibrary: [
      { id: 'bench-press', name: 'Press de banca', category: 'chest', equipment: ['barra'], measurement: 'repetitions', isBodyweight: false, isPerSide: false, muscles: { primary: ['pectoralis-major'], secondary: ['triceps'] } },
    ],
    weeklyPlan: {
      id: 'plan',
      name: 'Plan de prueba',
      effectiveFrom: '2026-08-24',
      days: withPlan ? [{
        id: 'day-a',
        weekday: 1,
        name: 'Día A',
        blocks: [{
          id: 'standard-1',
          type: 'standard',
          exercises: [{ exerciseId: 'bench-press', sets: 3, repetitions: { min: 8, max: 10 }, restSeconds: 90 }],
        }],
      }] : [],
    },
    scheduleOverrides: [],
    workoutSessions: [],
    progression: { exerciseRules: [] },
    pushSubscriptions: [],
    restTimers: [],
  };
}
