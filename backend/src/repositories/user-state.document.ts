import type { User, UserState } from '../domain/models.js';
import { GYM_EXERCISE_CATALOG } from '../domain/exercise-catalog.js';
import { badRequest } from '../http/errors.js';
import { deepClone } from '../utils/atomic-json.js';
import { validateStateDocument } from '../utils/state-validation.js';

export function normalizeAndValidateState(state: UserState, user: User): UserState {
  if (!state || typeof state !== 'object' || state.schemaVersion !== 1) {
    throw badRequest('State must use schemaVersion 1');
  }
  state.revision ??= 1;
  state.pushSubscriptions ??= [];
  state.restTimers ??= [];
  state.bodyMetrics ??= {
    profile: { sex: null, ageYears: null, heightCm: null, activityLevel: 'moderate', goal: 'maintain' },
    entries: [],
  };
  state.bodyMeasurementReminder ??= {
    enabled: true,
    intervalMonths: 1,
    nextDueAt: addOneMonth(user.createdAt),
    lastNotifiedAt: null,
  };
  state.onboarding ??= {
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
  };
  validateStateDocument(state);
  if (state.owner.userId !== user.id || state.owner.stateFileKey !== user.stateFileKey) {
    throw badRequest('State owner does not match the authenticated user');
  }
  const knownExercises = new Map(state.exerciseLibrary.map((exercise) => [exercise.id, exercise]));
  for (const catalogExercise of GYM_EXERCISE_CATALOG) {
    const existing = knownExercises.get(catalogExercise.id);
    if (!existing) {
      state.exerciseLibrary.push(deepClone(catalogExercise));
    } else if (existing.category === 'strength' || existing.category === 'mobility-conditioning') {
      existing.category = catalogExercise.category;
    }
  }
  return state;
}

export function createEmptyState(user: User): UserState {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    revision: 1,
    owner: {
      userId: user.id,
      stateFileKey: user.stateFileKey,
      createdAt: now,
      updatedAt: now,
    },
    preferences: {
      locale: 'es',
      timeZone: 'UTC',
      units: 'metric',
      weekStartsOn: 1,
      restTimer: {
        defaultSeconds: 120,
        sound: true,
        vibration: true,
        webPushWhenHidden: true,
      },
      guidedWorkout: {
        requestWakeLock: true,
        showRpe: true,
        showRir: true,
        prefillPreviousLoad: true,
      },
    },
    bodyWeight: { goal: null, entries: [] },
    bodyMetrics: {
      profile: { sex: null, ageYears: null, heightCm: null, activityLevel: 'moderate', goal: 'maintain' },
      entries: [],
    },
    bodyMeasurementReminder: {
      enabled: true,
      intervalMonths: 1,
      nextDueAt: addOneMonth(now),
      lastNotifiedAt: null,
    },
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
    exerciseLibrary: deepClone(GYM_EXERCISE_CATALOG),
    weeklyPlan: { id: 'base-plan', name: 'Plan semanal', effectiveFrom: now.slice(0, 10), days: [] },
    scheduleOverrides: [],
    workoutSessions: [],
    progression: { exerciseRules: [] },
    pushSubscriptions: [],
    restTimers: [],
  };
}

function addOneMonth(value: string): string {
  const date = new Date(value);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + 1);
  const daysInTargetMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, daysInTargetMonth));
  return date.toISOString();
}
