import { describe, expect, it } from 'vitest';
import { createWorkoutExercise } from '../features/guided-workout/WorkoutPage';
import { nextWorkoutStep, sessionExercisesWithContext } from '../features/guided-workout/workout-flow';
import type { PlanDay, WorkoutExercise, WorkoutSession } from '../types/state';

describe('guided workout initialization', () => {
  it('recovers the legacy superset context without changing stored sets or the base plan', () => {
    const a = createWorkoutExercise({ exerciseId: 'a', sets: 2, repetitions: { min: 8, max: 12 }, restSeconds: 0 }, false);
    const b = createWorkoutExercise({ exerciseId: 'b', sets: 2, durationSeconds: 30, restSeconds: 0 }, false);
    delete a.prescription;
    delete b.prescription;
    a.sets[0]!.completedAt = '2026-09-14T12:00:00Z';
    const session: WorkoutSession = { id: 'legacy', planDayId: 'day', scheduledDate: '2026-09-14', startedAt: '2026-09-14T11:59:00Z', completedAt: null, status: 'active', exercises: [a, b], notes: null };
    const day: PlanDay = { id: 'day', weekday: 1, name: 'Superserie', blocks: [{ id: 'pair', type: 'superset', rounds: 3, restAfterRoundSeconds: 75, exercises: [
      { exerciseId: 'a', sets: 3, repetitions: { min: 8, max: 12 }, restSeconds: 0 },
      { exerciseId: 'b', sets: 3, durationSeconds: 30, restSeconds: 0 },
    ] }] };
    const before = structuredClone({ session, day });
    const context = sessionExercisesWithContext(session, day);
    expect(context[0]?.prescription?.sets).toBe(2);
    expect(context[0]?.block?.rounds).toBe(2);
    expect(nextWorkoutStep(context, 'a', 1, 120)).toEqual({ restSeconds: 0, nextExerciseIndex: 1 });
    expect({ session, day }).toEqual(before);
    b.sets[0]!.completedAt = '2026-09-14T12:01:00Z';
    expect(nextWorkoutStep(sessionExercisesWithContext(session, day), 'b', 1, 120)).toEqual({ restSeconds: 75, nextExerciseIndex: 0 });
  });

  it('keeps a saved session prescription and block when the weekly plan changes', () => {
    const saved = createWorkoutExercise({ exerciseId: 'a', sets: 2, repetitions: { min: 6, max: 10 }, restSeconds: 90 }, false, null, true, { id: 'original', type: 'standard' });
    const session: WorkoutSession = { id: 'saved', planDayId: 'day', scheduledDate: '2026-09-14', startedAt: '2026-09-14T11:59:00Z', completedAt: null, status: 'active', exercises: [saved], notes: null };
    const changedDay: PlanDay = { id: 'day', weekday: 1, name: 'Changed', blocks: [{ id: 'replacement', type: 'standard', exercises: [{ exerciseId: 'a', sets: 4, repetitions: { min: 12, max: 15 }, restSeconds: 180 }] }] };
    expect(sessionExercisesWithContext(session, changedDay)[0]).toBe(saved);
    delete saved.prescription;
    delete saved.block;
    expect(sessionExercisesWithContext(session)).toEqual([saved]);
    saved.sets[0]!.completedAt = '2026-09-14T12:00:00Z';
    expect(nextWorkoutStep(sessionExercisesWithContext(session), 'a', 1, 120)).toEqual({ restSeconds: 120, nextExerciseIndex: null });
  });

  it('matches prior loads by set and side, with the last matching side as fallback', () => {
    const previous = createWorkoutExercise({ exerciseId: 'row', sets: 2, repetitions: { min: 8, max: 12 }, restSeconds: 90 }, true);
    previous.sets.forEach((set, index) => { set.loadKg = [10, 12, 14, 16][index]!; });
    const result = createWorkoutExercise({ exerciseId: 'row', sets: 3, repetitions: { min: 8, max: 12 }, restSeconds: 90 }, true, previous);
    expect(result.sets.map((set) => set.loadKg)).toEqual([10, 12, 14, 16, 14, 16]);
    expect(result.prescription?.sets).toBe(3);
  });

  it('alternates superset members and rests only after both sides finish a round', () => {
    const block = { id: 'pair', type: 'superset' as const, rounds: 2, restAfterRoundSeconds: 90 };
    const a = createWorkoutExercise({ exerciseId: 'a', sets: 2, repetitions: { min: 8, max: 12 }, restSeconds: 0 }, true, null, true, block);
    const b = createWorkoutExercise({ exerciseId: 'b', sets: 2, repetitions: { min: 8, max: 12 }, restSeconds: 0 }, false, null, true, block);
    const exercises = [a, b];
    a.sets[0]!.completedAt = '2026-09-14T12:00:00Z';
    expect(nextWorkoutStep(exercises, 'a', 1, 120)).toEqual({ restSeconds: 0, nextExerciseIndex: null });
    a.sets[1]!.completedAt = '2026-09-14T12:00:00Z';
    expect(nextWorkoutStep(exercises, 'a', 1, 120)).toEqual({ restSeconds: 0, nextExerciseIndex: 1 });
    b.sets[0]!.completedAt = '2026-09-14T12:00:00Z';
    expect(nextWorkoutStep(exercises, 'b', 1, 120)).toEqual({ restSeconds: 90, nextExerciseIndex: 0 });
    exercises.forEach((item) => item.sets.forEach((set) => { set.completedAt = '2026-09-14T12:00:00Z'; }));
    expect(nextWorkoutStep(exercises, 'b', 2, 120)).toEqual({ restSeconds: 0, nextExerciseIndex: null });
  });

  it('prefills prior load and expands per-side prescriptions', () => {
    const previous: WorkoutExercise = {
      exerciseId: 'split-squat',
      estimatedOneRepMaxKg: null,
      notes: null,
      sets: [{ setNumber: 1, loadKg: 18, repetitions: 10, durationSeconds: null, side: 'left', rpe: 8, rir: 2, completedAt: new Date().toISOString() }],
    };
    const workout = createWorkoutExercise({
      exerciseId: 'split-squat',
      sets: 3,
      repetitions: { min: 8, max: 12 },
      restSeconds: 90,
    }, true, previous);

    expect(workout.sets).toHaveLength(6);
    expect(workout.sets.every((set) => set.loadKg === 18)).toBe(true);
    expect(workout.sets.map((set) => set.side)).toEqual(['left', 'right', 'left', 'right', 'left', 'right']);
  });

  it('creates timed sets without repetitions', () => {
    const workout = createWorkoutExercise({ exerciseId: 'plank', sets: 3, durationSeconds: 45, restSeconds: 60 }, false);
    expect(workout.sets.map((set) => set.durationSeconds)).toEqual([45, 45, 45]);
    expect(workout.sets.every((set) => set.repetitions === null)).toBe(true);
  });
});
