import { describe, expect, it } from 'vitest';
import type { ExerciseProgressionRule, UserState, WorkoutExercise } from '../src/domain/models.js';
import { estimateOneRepMax, evaluateProgression, ProgressionService } from '../src/services/progression.service.js';

function exercise(repetitions: Array<number | null>, loadKg = 100): WorkoutExercise {
  return {
    exerciseId: 'back-squat',
    sets: repetitions.map((reps, index) => ({
      setNumber: index + 1,
      loadKg,
      repetitions: reps,
      durationSeconds: null,
      side: null,
      rpe: null,
      rir: null,
      completedAt: reps === null ? null : new Date().toISOString(),
    })),
    estimatedOneRepMaxKg: null,
    notes: null,
  };
}

function rule(strategy: ExerciseProgressionRule['strategy']): ExerciseProgressionRule {
  return {
    exerciseId: 'back-squat',
    strategy,
    config: {
      incrementKg: 2.5,
      deloadAfterFailures: 2,
      deloadPercent: 10,
      sets: 3,
      targetReps: 5,
      ...(strategy === 'double-progression' ? { repRange: { min: 8, max: 12 } } : {}),
    },
    state: {
      nextLoadKg: 100,
      consecutiveFailures: 0,
      deloadCount: 0,
      lastEvaluatedSessionId: null,
    },
  };
}

describe('progression engine', () => {
  it('calculates Epley estimated 1RM', () => {
    expect(estimateOneRepMax(100, 5)).toBe(116.7);
    expect(estimateOneRepMax(100, 1)).toBe(100);
  });

  it.each(['greyskull-lp', 'linear-progression'] as const)(
    'increments load after a successful %s session',
    (strategy) => {
      const result = evaluateProgression(rule(strategy), exercise([5, 5, 7]), 'session-1');
      expect(result.succeeded).toBe(true);
      expect(result.nextState.nextLoadKg).toBe(102.5);
      expect(result.nextState.consecutiveFailures).toBe(0);
    },
  );

  it('holds double progression until every set reaches the upper range', () => {
    const held = evaluateProgression(rule('double-progression'), exercise([10, 10, 10]), 'session-1');
    const advanced = evaluateProgression(rule('double-progression'), exercise([12, 12, 12]), 'session-2');
    expect(held.nextState.nextLoadKg).toBe(100);
    expect(held.nextState.consecutiveFailures).toBe(0);
    expect(advanced.nextState.nextLoadKg).toBe(102.5);
  });

  it('deloads and resets the failure counter at the configured threshold', () => {
    const currentRule = rule('linear-progression');
    const firstFailure = evaluateProgression(currentRule, exercise([5, 4, null]), 'session-1');
    currentRule.state = firstFailure.nextState;
    const secondFailure = evaluateProgression(currentRule, exercise([4, 4, 4]), 'session-2');

    expect(firstFailure.deloaded).toBe(false);
    expect(secondFailure.deloaded).toBe(true);
    expect(secondFailure.nextState.nextLoadKg).toBe(90);
    expect(secondFailure.nextState.consecutiveFailures).toBe(0);
    expect(secondFailure.nextState.deloadCount).toBe(1);
  });

  it('does not complete or advance progression while any planned set is incomplete', () => {
    const progressionRule = rule('linear-progression');
    const sessionExercise = exercise([5, null, 5]);
    const session = {
      id: 'session-1',
      status: 'active',
      exercises: [sessionExercise],
      completedAt: null,
    };
    const state = {
      workoutSessions: [session],
      progression: { exerciseRules: [progressionRule] },
    } as unknown as UserState;

    expect(() => new ProgressionService().completeSession(state, session.id)).toThrow(
      'Complete every workout set before finishing the session',
    );
    expect(session.status).toBe('active');
    expect(session.completedAt).toBeNull();
    expect(progressionRule.state.lastEvaluatedSessionId).toBeNull();
    expect(progressionRule.state.nextLoadKg).toBe(100);
  });
});
