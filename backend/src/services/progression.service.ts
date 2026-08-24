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
  const completed = exercise.sets.filter(
    (set) => set.completedAt !== null && set.repetitions !== null && set.repetitions > 0,
  );
  const config = rule.config;
  const minimumReps = config.repRange?.min ?? config.targetReps ?? 5;
  const maximumReps = config.repRange?.max ?? minimumReps;
  const expectedSets = config.sets ?? Math.max(1, exercise.sets.length);
  const currentLoad = Math.max(0, ...exercise.sets.map((set) => set.loadKg ?? 0));
  const completedMinimum = completed.length >= expectedSets && completed.every((set) => set.repetitions! >= minimumReps);
  const reachedUpperRange = completedMinimum && completed.every((set) => set.repetitions! >= maximumReps);
  const succeeded = rule.strategy === 'double-progression' ? reachedUpperRange : completedMinimum;
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

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function roundToIncrement(value: number, increment: number): number {
  if (!Number.isFinite(increment) || increment <= 0) return round(value, 2);
  return round(Math.round(value / increment) * increment, 2);
}
