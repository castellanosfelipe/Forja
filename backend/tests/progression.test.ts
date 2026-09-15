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
  it('completes a legacy session using its recorded rounds and current plan targets instead of a mismatched rule', () => {
    const progressionRule = rule('double-progression');
    const recorded = exercise([10, 10]);
    const state = {
      workoutSessions: [{ id: 'legacy', planDayId: 'day', status: 'active', exercises: [recorded], completedAt: null }],
      weeklyPlan: { days: [{ id: 'day', blocks: [{ id: 'pair', type: 'superset', rounds: 3, exercises: [{ exerciseId: recorded.exerciseId, sets: 3, repetitions: { min: 6, max: 10 }, restSeconds: 90 }] }] }] },
      progression: { exerciseRules: [progressionRule] },
    } as unknown as UserState;
    const planBefore = structuredClone(state.weeklyPlan);
    new ProgressionService().completeSession(state, 'legacy', '2026-09-14T12:00:00Z');
    expect(recorded.prescription).toEqual({ sets: 2, repetitions: { min: 6, max: 10 }, restSeconds: 90 });
    expect(progressionRule.state.nextLoadKg).toBe(102.5);
    expect(state.weeklyPlan).toEqual(planBefore);
    expect(state.workoutSessions[0]?.status).toBe('completed');
    new ProgressionService().completeSession(state, 'legacy', '2026-09-14T12:01:00Z');
    expect(progressionRule.state.nextLoadKg).toBe(102.5);
  });

  it('never replaces a stored prescription with a later plan revision', () => {
    const progressionRule = rule('double-progression');
    const recorded = exercise([10, 10]);
    recorded.prescription = { sets: 2, repetitions: { min: 6, max: 10 }, restSeconds: 90 };
    const state = {
      workoutSessions: [{ id: 'snapshot', planDayId: 'day', status: 'active', exercises: [recorded], completedAt: null }],
      weeklyPlan: { days: [{ id: 'day', blocks: [{ exercises: [{ exerciseId: recorded.exerciseId, sets: 4, repetitions: { min: 12, max: 15 }, restSeconds: 180 }] }] }] },
      progression: { exerciseRules: [progressionRule] },
    } as unknown as UserState;
    new ProgressionService().completeSession(state, 'snapshot', '2026-09-14T12:00:00Z');
    expect(recorded.prescription.sets).toBe(2);
    expect(recorded.prescription.repetitions?.max).toBe(10);
    expect(progressionRule.state.nextLoadKg).toBe(102.5);
  });

  it('uses the session prescription over a rule inherited from another day', () => {
    const planned = exercise([10, 10]);
    planned.prescription = { sets: 2, repetitions: { min: 6, max: 10 }, restSeconds: 90 };
    const result = evaluateProgression(rule('double-progression'), planned, 'snapshot');
    expect(result.succeeded).toBe(true);
    expect(result.nextState.consecutiveFailures).toBe(0);
    expect(result.nextState.nextLoadKg).toBe(102.5);
  });

  it('does not penalize timed exercises with a legacy repetition progression rule', () => {
    const timed = exercise([null, null], 0);
    timed.prescription = { sets: 2, durationSeconds: 30, restSeconds: 60 };
    timed.sets.forEach((set) => { set.durationSeconds = 30; set.completedAt = '2026-09-14T12:00:00Z'; });
    const previous = rule('linear-progression');
    previous.state.consecutiveFailures = 1;
    const result = evaluateProgression(previous, timed, 'timed');
    expect(result.succeeded).toBe(true);
    expect(result.deloaded).toBe(false);
    expect(result.nextState.consecutiveFailures).toBe(0);
    expect(result.nextState.deloadCount).toBe(0);
    expect(result.nextState.nextLoadKg).toBe(previous.state.nextLoadKg);
  });

  it('requires both sides of every prescribed round before increasing load', () => {
    const oneSided = exercise([5, 5, 5]);
    oneSided.sets.forEach((set) => { set.side = 'left'; });
    expect(evaluateProgression(rule('linear-progression'), oneSided, 'missing-right').succeeded).toBe(false);
    oneSided.sets.push(...oneSided.sets.map((set) => ({ ...set, side: 'right' as const })));
    expect(evaluateProgression(rule('linear-progression'), oneSided, 'both-sides').succeeded).toBe(true);
  });

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
