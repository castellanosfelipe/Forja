import { describe, expect, it } from 'vitest';
import { createWorkoutExercise } from '../features/guided-workout/WorkoutPage';
import type { WorkoutExercise } from '../types/state';

describe('guided workout initialization', () => {
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
