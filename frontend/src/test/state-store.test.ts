import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserState } from '../types/state';

const offline = vi.hoisted(() => new Map<string, unknown>());
const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('../pwa/offline-db', () => ({
  readOfflineValue: vi.fn(async (key: string) => structuredClone(offline.get(key) ?? null)),
  writeOfflineValue: vi.fn(async (key: string, value: unknown) => {
    offline.set(key, structuredClone(value));
  }),
  deleteOfflineValue: vi.fn(async (key: string) => {
    offline.delete(key);
  }),
}));

vi.mock('../api/state.api', () => ({ stateApi: apiMocks }));

import { rebasePendingState, useStateStore } from '../stores/state.store';

function state(revision = 1): UserState {
  const now = '2026-08-24T12:00:00.000Z';
  return {
    schemaVersion: 1,
    revision,
    owner: { userId: 'user', stateFileKey: 'user', createdAt: now, updatedAt: now },
    preferences: { locale: 'es', restTimer: {}, guidedWorkout: {} },
    bodyWeight: { goal: null, entries: [] },
    bodyMetrics: {
      profile: { sex: null, ageYears: null, heightCm: null, activityLevel: 'moderate', goal: 'maintain' },
      entries: [],
    },
    bodyMeasurementReminder: { enabled: true, intervalMonths: 1, nextDueAt: now, lastNotifiedAt: null },
    onboarding: {
      completedAt: null,
      trainingGoal: 'hypertrophy',
      experience: 'beginner',
      trainingDaysPerWeek: 3,
      sessionMinutes: 60,
      equipment: 'full-gym',
      priorityMuscles: [],
      limitations: [],
      generatedAt: null,
      methodologyVersion: 'forja-safe-v1',
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

describe('state synchronization', () => {
  beforeEach(() => {
    offline.clear();
    apiMocks.get.mockReset();
    apiMocks.replace.mockReset();
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
    useStateStore.setState({
      state: state(),
      status: 'idle',
      error: null,
      hasPendingChanges: false,
    });
  });

  it('serializes rapid mutations so neither change is lost', async () => {
    apiMocks.replace.mockImplementation(async (candidate: UserState) => ({
      ...structuredClone(candidate),
      revision: candidate.revision + 1,
    }));

    await Promise.all([
      useStateStore.getState().update((draft) => {
        draft.bodyWeight.goal = { targetKg: 75, targetDate: null };
      }),
      useStateStore.getState().update((draft) => {
        draft.preferences.locale = 'en';
      }),
    ]);

    const saved = useStateStore.getState().state;
    expect(saved?.bodyWeight.goal?.targetKg).toBe(75);
    expect(saved?.preferences.locale).toBe('en');
    expect(saved?.revision).toBe(3);
    expect(apiMocks.replace).toHaveBeenCalledTimes(2);
  });

  it('rebases local workout changes over a server-owned Push timer revision', () => {
    const base = state(1);
    const pending = structuredClone(base);
    pending.workoutSessions.push({
      id: 'session',
      planDayId: null,
      scheduledDate: '2026-08-24',
      startedAt: '2026-08-24T12:00:00.000Z',
      completedAt: null,
      status: 'active',
      exercises: [],
      notes: null,
    });
    const remote = structuredClone(base);
    remote.revision = 2;
    remote.restTimers.push({
      id: 'timer',
      dueAt: '2026-08-24T12:02:00.000Z',
      title: 'Descanso terminado',
      body: 'Siguiente serie',
      status: 'scheduled',
      createdAt: '2026-08-24T12:00:00.000Z',
      completedAt: null,
    });

    const rebased = rebasePendingState(base, pending, remote);
    expect(rebased?.revision).toBe(2);
    expect(rebased?.workoutSessions).toHaveLength(1);
    expect(rebased?.restTimers).toEqual(remote.restTimers);
  });

  it('does not silently overwrite a field changed differently on both sides', () => {
    const base = state(1);
    const pending = structuredClone(base);
    const remote = structuredClone(base);
    pending.preferences.locale = 'en';
    remote.preferences.locale = 'pt';
    remote.revision = 2;

    expect(rebasePendingState(base, pending, remote)).toBeNull();
  });

  it('refuses a destructive refresh unless discarding pending data was explicitly confirmed', async () => {
    useStateStore.setState({ hasPendingChanges: true, status: 'conflict' });

    await expect(useStateStore.getState().refresh()).rejects.toThrow('cambios por guardar en tu cuenta');
    expect(apiMocks.get).not.toHaveBeenCalled();

    apiMocks.get.mockResolvedValueOnce(state(2));
    await useStateStore.getState().refresh({ discardPending: true });
    expect(useStateStore.getState().state?.revision).toBe(2);
    expect(useStateStore.getState().hasPendingChanges).toBe(false);
  });
});
