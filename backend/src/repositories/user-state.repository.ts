import { access } from 'node:fs/promises';
import { join } from 'node:path';
import type { User, UserState } from '../domain/models.js';
import { GYM_EXERCISE_CATALOG } from '../domain/exercise-catalog.js';
import { badRequest, conflict, serviceUnavailable } from '../http/errors.js';
import { deepClone, Mutex, readJson, writeJsonAtomic } from '../utils/atomic-json.js';
import { validateStateDocument } from '../utils/state-validation.js';

export class UserStateRepository {
  private readonly mutexes = new Map<string, Mutex>();

  public constructor(private readonly dataDir: string) {}

  public async getOrCreate(user: User): Promise<UserState> {
    return this.mutexFor(user.stateFileKey).run(async () => {
      const path = this.pathFor(user.stateFileKey);
      try {
        await access(path);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw serviceUnavailable('No pudimos acceder al archivo de datos guardados');
        await writeJsonAtomic(path, this.createEmptyState(user));
      }
      let state: UserState;
      try { state = await readJson<UserState>(path); }
      catch { throw serviceUnavailable('No pudimos leer el archivo de datos. Se conserva sin cambios para su revisión.'); }
      const previousStateSignature = JSON.stringify(state);
      let normalized: UserState;
      try { normalized = this.normalizeAndValidate(state, user); }
      catch { throw serviceUnavailable('Tus datos guardados necesitan una revisión. El archivo se conserva sin cambios.'); }
      const normalizedStateSignature = JSON.stringify(normalized);
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
      // Notification subscriptions/timers are owned by their dedicated endpoints.
      // A stale offline snapshot must never resurrect cancelled server work.
      input.pushSubscriptions = current.pushSubscriptions;
      input.restTimers = current.restTimers;
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
      return await this.readValidated(user, path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      const state = this.createEmptyState(user);
      await writeJsonAtomic(path, state);
      return state;
    }
  }

  private async readValidated(user: User, path: string): Promise<UserState> {
    try { return this.normalizeAndValidate(await readJson<UserState>(path), user); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw error;
      console.error(JSON.stringify({level:'error',event:'state_read_failed',userId:user.id,reason:error instanceof Error?error.message:'invalid state'}));
      throw serviceUnavailable('No pudimos leer tus datos guardados. El archivo se conserva sin cambios; solicita una revisión antes de continuar.');
    }
  }

  private normalizeAndValidate(state: UserState, user: User): UserState {
    if (!state || typeof state !== 'object' || state.schemaVersion !== 1) {
      throw badRequest('State must use schemaVersion 1');
    }
    state.revision ??= 1;
    if(state.pushSubscriptions===undefined) state.pushSubscriptions = [];
    if(state.restTimers===undefined) state.restTimers = [];
    if(state.bodyMetrics===undefined) state.bodyMetrics = {
      profile: { sex: null, ageYears: null, heightCm: null, activityLevel: 'moderate', goal: 'maintain' },
      entries: [],
    };
    if(state.bodyMeasurementReminder===undefined) state.bodyMeasurementReminder = {
      enabled: true,
      intervalMonths: 1,
      nextDueAt: addOneMonth(user.createdAt),
      lastNotifiedAt: null,
    };
    if(state.onboarding===undefined) state.onboarding = {
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
