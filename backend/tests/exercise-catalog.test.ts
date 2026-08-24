import { describe, expect, it } from 'vitest';
import { GYM_EXERCISE_CATALOG, GYM_EXERCISE_IDS } from '../src/domain/exercise-catalog.js';

describe('gym exercise catalog', () => {
  it('contains a unique and categorized comprehensive base library', () => {
    const categories = new Set(GYM_EXERCISE_CATALOG.map((exercise) => exercise.category));

    expect(GYM_EXERCISE_CATALOG).toHaveLength(195);
    expect(GYM_EXERCISE_IDS.size).toBe(GYM_EXERCISE_CATALOG.length);
    expect(categories.size).toBe(16);
    expect(categories).toEqual(new Set([
      'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms', 'quadriceps', 'hamstrings',
      'glutes', 'adductors-abductors', 'calves', 'core', 'full-body', 'olympic', 'cardio', 'mobility',
    ]));
  });

  it('keeps every entry usable by the workout data model', () => {
    for (const exercise of GYM_EXERCISE_CATALOG) {
      expect(exercise.id).toMatch(/^[a-z0-9-]+$/);
      expect(exercise.name.trim().length).toBeGreaterThan(3);
      expect(exercise.muscles.primary.length).toBeGreaterThan(0);
      expect(['repetitions', 'duration']).toContain(exercise.measurement);
    }
  });
});
