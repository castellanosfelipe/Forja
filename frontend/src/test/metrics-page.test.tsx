import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MetricsPage } from '../features/metrics/MetricsPage';
import { useStateStore } from '../stores/state.store';
import type { UserState } from '../types/state';

const originalUpdate = useStateStore.getState().update;

afterEach(() => {
  useStateStore.setState({ state: null, status: 'idle', error: null, hasPendingChanges: false, update: originalUpdate });
});

describe('MetricsPage history consistency', () => {
  it('prefills the newest weight, including a later dashboard entry', () => {
    const value = fixture();
    value.bodyWeight.entries.push({ id: 'latest', measuredAt: '2026-09-14T12:00:00Z', weightKg: 75, note: null });
    useStateStore.setState({ state: value });
    render(<MetricsPage />);
    expect((screen.getByRole('spinbutton', { name: 'Peso kg' }) as HTMLInputElement).value).toBe('75');
  });

  it('removes the weight entry generated together with a deleted body measurement', async () => {
    const user = userEvent.setup();
    const value = fixture();
    const update = vi.fn(async (mutator: (state: UserState) => void) => {
      const draft = structuredClone(useStateStore.getState().state!);
      mutator(draft);
      useStateStore.setState({ state: draft });
    }) as unknown as ReturnType<typeof useStateStore.getState>['update'];
    useStateStore.setState({ state: value, update });

    render(<MetricsPage />);
    await user.click(screen.getByRole('button', { name: /Eliminar medición del/ }));
    expect(screen.getByRole('alertdialog', { name: '¿Eliminar esta medición?' }).textContent).toContain('registro de peso');
    await user.click(screen.getByRole('button', { name: 'Eliminar medición' }));

    await waitFor(() => expect(useStateStore.getState().state?.bodyMetrics.entries).toHaveLength(0));
    expect(useStateStore.getState().state?.bodyWeight.entries).toHaveLength(0);
    expect(screen.getByRole('status').textContent).toContain('tendencia de peso asociada');
  });
});

function fixture(): UserState {
  const measuredAt = '2026-08-24T12:00:00.000Z';
  return {
    schemaVersion: 1,
    revision: 1,
    owner: { userId: 'user', stateFileKey: 'user', createdAt: measuredAt, updatedAt: measuredAt },
    preferences: { locale: 'es' },
    bodyWeight: {
      goal: null,
      entries: [{ id: 'generated-weight', measuredAt, weightKg: 80, note: 'Medición de composición corporal' }],
    },
    bodyMetrics: {
      profile: { sex: 'male', ageYears: 30, heightCm: 180, activityLevel: 'moderate', goal: 'maintain' },
      entries: [{
        id: 'metric', measuredAt, weightKg: 80, neckCm: 38, waistCm: 85, hipCm: null,
        bmi: 24.7, bodyFatPercent: 18, leanMassKg: 65.6, ffmi: 20.2,
        basalMetabolicRateKcal: 1750, totalDailyEnergyExpenditureKcal: 2700, targetCaloriesKcal: 2700,
        macros: { proteinGrams: 160, fatGrams: 80, carbohydrateGrams: 335, proteinPercent: 24, fatPercent: 27, carbohydratePercent: 49 },
        note: null,
      }],
    },
    exerciseLibrary: [],
    weeklyPlan: { id: 'plan', name: 'Plan', effectiveFrom: '2026-08-24', days: [] },
    scheduleOverrides: [],
    workoutSessions: [],
    progression: { exerciseRules: [] },
    pushSubscriptions: [],
    restTimers: [],
  };
}
