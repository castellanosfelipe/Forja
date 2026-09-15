import type {
  ExerciseProgressionRule,
  ProgressionState,
  UserState,
  WorkoutExercise,
  WorkoutSession,
} from '../domain/models.js';
import { conflict, notFound } from '../http/errors.js';

export interface ProgressionEvaluation {
  succeeded: boolean;
  deloaded: boolean;
  nextState: ProgressionState;
}

export function estimateOneRepMax(loadKg: number, repetitions: number): number {
  if (!Number.isFinite(loadKg) || loadKg < 0 || !Number.isInteger(repetitions) || repetitions < 1) {
    throw new RangeError('loadKg and repetitions must be positive');
  }
  if (repetitions === 1) return round(loadKg, 1);
  return round(loadKg * (1 + repetitions / 30), 1);
}

export function evaluateProgression(
  rule: ExerciseProgressionRule,
  exercise: WorkoutExercise,
  sessionId: string,
): ProgressionEvaluation {
  const timed = exercise.prescription?.durationSeconds !== undefined
    || exercise.sets.every((set) => set.repetitions === null && set.durationSeconds !== null);
  if (timed) {
    return {
      succeeded: exercise.sets.length > 0 && exercise.sets.every((set) => set.completedAt !== null && (set.durationSeconds ?? 0) >= (exercise.prescription?.durationSeconds ?? 1)),
      deloaded: false,
      nextState: { ...rule.state, consecutiveFailures: 0, lastEvaluatedSessionId: sessionId },
    };
  }
  const completed = exercise.sets.filter(
    (set) => set.completedAt !== null && set.repetitions !== null && set.repetitions > 0,
  );
  const config = rule.config;
  const minimumReps = exercise.prescription?.repetitions?.min ?? config.repRange?.min ?? config.targetReps ?? 5;
  const maximumReps = exercise.prescription?.repetitions?.max ?? config.repRange?.max ?? minimumReps;
  const expectedSets = exercise.prescription?.sets ?? config.sets ?? Math.max(1, new Set(exercise.sets.map((set) => set.setNumber)).size);
  const currentLoad = Math.max(0, ...exercise.sets.map((set) => set.loadKg ?? 0));
  const sides = exercise.sets.some((set) => set.side !== null) ? ['left', 'right'] : [null];
  const completeRounds = Array.from({ length: expectedSets }, (_, index) => index + 1)
    .every((setNumber) => sides.every((side) => completed.some((set) => set.setNumber === setNumber && set.side === side)));
  const completedMinimum = completeRounds && completed.every((set) => set.repetitions! >= minimumReps);
  const reachedUpperRange = completedMinimum && completed.every((set) => set.repetitions! >= maximumReps);
  const amrapSetNumber = Math.min(config.amrapSetNumber ?? expectedSets, expectedSets);
  const amrapCompleted = sides.every((side) => completed.some((set) => set.setNumber === amrapSetNumber && set.side === side && set.repetitions! >= minimumReps));
  const succeeded = rule.strategy === 'double-progression' ? reachedUpperRange
    : rule.strategy === 'greyskull-lp' ? completedMinimum && amrapCompleted : completedMinimum;
  const shouldHold = rule.strategy === 'double-progression' && completedMinimum && !reachedUpperRange;
  let nextLoadKg = currentLoad;
  let consecutiveFailures = rule.state.consecutiveFailures;
  let deloadCount = rule.state.deloadCount;
  let deloaded = false;

  if (succeeded) {
    nextLoadKg = roundToIncrement(currentLoad + config.incrementKg, config.incrementKg);
    consecutiveFailures = 0;
  } else if (shouldHold) {
    consecutiveFailures = 0;
  } else {
    consecutiveFailures += 1;
    if (consecutiveFailures >= config.deloadAfterFailures) {
      nextLoadKg = roundToIncrement(currentLoad * (1 - config.deloadPercent / 100), config.incrementKg);
      consecutiveFailures = 0;
      deloadCount += 1;
      deloaded = true;
    }
  }

  return {
    succeeded,
    deloaded,
    nextState: {
      nextLoadKg: Math.max(0, nextLoadKg),
      consecutiveFailures,
      deloadCount,
      lastEvaluatedSessionId: sessionId,
    },
  };
}

export class ProgressionService {
  public completeSession(state: UserState, sessionId: string, completedAt = new Date().toISOString()): WorkoutSession {
    const session = state.workoutSessions.find((candidate) => candidate.id === sessionId);
    if (!session) throw notFound('Workout session not found');
    if (session.status === 'cancelled') throw conflict('Cancelled workout cannot be completed');
    if (session.status === 'completed') return session;
    if (
      session.exercises.length === 0 ||
      session.exercises.some(
        (exercise) =>
          exercise.sets.length === 0 ||
          exercise.sets.some(
            (set) =>
              set.completedAt === null ||
              ((set.repetitions ?? 0) <= 0 && (set.durationSeconds ?? 0) <= 0),
          ),
      )
    ) {
      throw conflict('Complete every workout set before finishing the session');
    }

    for (const exercise of session.exercises) {
      if (!exercise.prescription) {
        // Legacy active sessions did not retain a prescription. Preserve their actual
        // round count; the plan may have been changed since the session started.
        const prescribed = legacyPrescription(state, session, exercise);
        if (prescribed) exercise.prescription = prescribed;
      }
      exercise.estimatedOneRepMaxKg = this.estimatedOneRepMaxForExercise(exercise);
      const rule = state.progression.exerciseRules.find((candidate) => candidate.exerciseId === exercise.exerciseId);
      if (rule && rule.state.lastEvaluatedSessionId !== session.id) {
        rule.state = evaluateProgression(rule, exercise, session.id).nextState;
      }
    }
    session.status = 'completed';
    session.completedAt = completedAt;
    return session;
  }

  public previousPerformance(state: UserState, exerciseId: string): WorkoutExercise | null {
    const sessions = [...state.workoutSessions]
      .filter((session) => session.status === 'completed')
      .sort((left, right) => (right.completedAt ?? '').localeCompare(left.completedAt ?? ''));
    for (const session of sessions) {
      const exercise = session.exercises.find((candidate) => candidate.exerciseId === exerciseId);
      if (exercise) return structuredClone(exercise);
    }
    return null;
  }

  private estimatedOneRepMaxForExercise(exercise: WorkoutExercise): number | null {
    const estimates = exercise.sets.flatMap((set) => {
      if ((set.loadKg ?? 0) <= 0 || (set.repetitions ?? 0) <= 0) return [];
      return [estimateOneRepMax(set.loadKg!, set.repetitions!)];
    });
    return estimates.length ? Math.max(...estimates) : null;
  }
}

function legacyPrescription(state: UserState, session: WorkoutSession, exercise: WorkoutExercise): WorkoutExercise['prescription'] {
  const days = state.weeklyPlan?.days;
  if (!Array.isArray(days)) return undefined;
  const day: unknown = days.find((candidate: unknown) => isRecord(candidate) && candidate.id === session.planDayId);
  if (!isRecord(day) || !Array.isArray(day.blocks)) return undefined;
  const prescriptions: unknown[] = day.blocks.flatMap((block: unknown) => isRecord(block) && Array.isArray(block.exercises) ? block.exercises : []);
  const prescribed = prescriptions.find((candidate) => isRecord(candidate) && candidate.exerciseId === exercise.exerciseId);
  if (!isRecord(prescribed) || typeof prescribed.restSeconds !== 'number' || !Number.isFinite(prescribed.restSeconds) || prescribed.restSeconds < 0) return undefined;
  const snapshot: NonNullable<WorkoutExercise['prescription']> = {
    sets: new Set(exercise.sets.map((set) => set.setNumber)).size,
    restSeconds: prescribed.restSeconds,
  };
  const repetitions = prescribed.repetitions;
  if (isRecord(repetitions) && typeof repetitions.min === 'number' && typeof repetitions.max === 'number'
    && Number.isInteger(repetitions.min) && Number.isInteger(repetitions.max) && repetitions.min > 0 && repetitions.max >= repetitions.min) {
    snapshot.repetitions = { min: repetitions.min, max: repetitions.max };
  } else if (typeof prescribed.durationSeconds === 'number' && Number.isInteger(prescribed.durationSeconds) && prescribed.durationSeconds > 0) {
    snapshot.durationSeconds = prescribed.durationSeconds;
  } else return undefined;
  return snapshot;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function roundToIncrement(value: number, increment: number): number {
  if (!Number.isFinite(increment) || increment <= 0) return round(value, 2);
  return round(Math.round(value / increment) * increment, 2);
}
