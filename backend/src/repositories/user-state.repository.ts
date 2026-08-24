import { access } from 'node:fs/promises';
import { join } from 'node:path';
import type { User, UserState } from '../domain/models.js';
import { GYM_EXERCISE_CATALOG } from '../domain/exercise-catalog.js';
import { badRequest, conflict } from '../http/errors.js';
import { deepClone, Mutex, readJson, writeJsonAtomic } from '../utils/atomic-json.js';

export class UserStateRepository {
  private readonly mutexes = new Map<string, Mutex>();

  public constructor(private readonly dataDir: string) {}

  public async getOrCreate(user: User): Promise<UserState> {
    return this.mutexFor(user.stateFileKey).run(async () => {
      const path = this.pathFor(user.stateFileKey);
      try {
        await access(path);
      } catch {
        await writeJsonAtomic(path, this.createEmptyState(user));
      }
      const state = await readJson<UserState>(path);
      const previousStateSignature = JSON.stringify({
        catalog: state.exerciseLibrary?.map(({ id, category }) => [id, category]) ?? [],
        reminder: state.bodyMeasurementReminder ?? null,
        onboarding: state.onboarding ?? null,
      });
      const normalized = this.normalizeAndValidate(state, user);
      const normalizedStateSignature = JSON.stringify({
        catalog: normalized.exerciseLibrary.map(({ id, category }) => [id, category]),
        reminder: normalized.bodyMeasurementReminder,
        onboarding: normalized.onboarding,
      });
      if (normalizedStateSignature !== previousStateSignature) {
        normalized.revision += 1;
        normalized.owner.updatedAt = new Date().toISOString();
        await writeJsonAtomic(path, normalized);
      }
      return deepClone(normalized);
    });
  }

  public async replace(user: User, candidate: unknown, expectedRevision: number | null): Promise<UserState> {
    return this.mutexFor(user.stateFileKey).run(async () => {
      const path = this.pathFor(user.stateFileKey);
      const current = await this.readOrCreateUnlocked(user, path);
      if (expectedRevision !== null && current.revision !== expectedRevision) {
        throw conflict(`State revision mismatch; current revision is ${current.revision}`);
      }
      const input = this.normalizeAndValidate(deepClone(candidate) as UserState, user);
      input.revision = current.revision + 1;
      input.owner.createdAt = current.owner.createdAt;
      input.owner.updatedAt = new Date().toISOString();
      input.owner.userId = user.id;
      input.owner.stateFileKey = user.stateFileKey;
      await writeJsonAtomic(path, input);
      return deepClone(input);
    });
  }

  public async mutate(user: User, operation: (state: UserState) => void): Promise<UserState> {
    return this.mutexFor(user.stateFileKey).run(async () => {
      const path = this.pathFor(user.stateFileKey);
      const state = await this.readOrCreateUnlocked(user, path);
      operation(state);
      state.revision += 1;
      state.owner.updatedAt = new Date().toISOString();
      this.normalizeAndValidate(state, user);
      await writeJsonAtomic(path, state);
      return deepClone(state);
    });
  }

  private async readOrCreateUnlocked(user: User, path: string): Promise<UserState> {
    try {
      const state = await readJson<UserState>(path);
      return this.normalizeAndValidate(state, user);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      const state = this.createEmptyState(user);
      await writeJsonAtomic(path, state);
      return state;
    }
  }

  private normalizeAndValidate(state: UserState, user: User): UserState {
    if (!state || typeof state !== 'object' || state.schemaVersion !== 1) {
      throw badRequest('State must use schemaVersion 1');
    }
    state.revision = Number.isSafeInteger(state.revision) && state.revision > 0 ? state.revision : 1;
    state.pushSubscriptions ??= [];
    state.restTimers ??= [];
    state.bodyMetrics ??= {
      profile: { sex: null, ageYears: null, heightCm: null, activityLevel: 'moderate', goal: 'maintain' },
      entries: [],
    };
    state.bodyMeasurementReminder ??= {
      enabled: true,
      intervalMonths: 1,
      nextDueAt: addOneMonth(state.owner?.createdAt ?? new Date().toISOString()),
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
    if (
      !state.owner ||
      !state.bodyWeight ||
      !Array.isArray(state.bodyWeight.entries) ||
      !state.bodyMetrics ||
      !state.bodyMetrics.profile ||
      !Array.isArray(state.bodyMetrics.entries) ||
      !Array.isArray(state.onboarding.priorityMuscles) ||
      !Array.isArray(state.onboarding.limitations) ||
      !Array.isArray(state.exerciseLibrary) ||
      !Array.isArray(state.scheduleOverrides) ||
      !Array.isArray(state.workoutSessions) ||
      !state.progression ||
      !Array.isArray(state.progression.exerciseRules) ||
      !Array.isArray(state.pushSubscriptions) ||
      !Array.isArray(state.restTimers)
    ) {
      throw badRequest('State document is missing required collections');
    }
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

  private createEmptyState(user: User): UserState {
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

  private pathFor(stateFileKey: string): string {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(stateFileKey)) {
      throw new Error('Unsafe state file key');
    }
    return join(this.dataDir, `state-${stateFileKey}.json`);
  }

  private mutexFor(key: string): Mutex {
    const existing = this.mutexes.get(key);
    if (existing) return existing;
    const mutex = new Mutex();
    this.mutexes.set(key, mutex);
    return mutex;
  }
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
