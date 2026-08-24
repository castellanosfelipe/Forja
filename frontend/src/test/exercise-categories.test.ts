import { describe, expect, it } from 'vitest';
import { EXERCISE_CATEGORIES, exerciseCategory } from '../features/exercises/exercise-categories';

describe('exercise categories', () => {
  it('exposes every built-in catalog category with Spanish product copy', () => {
    expect(EXERCISE_CATEGORIES.slice(0, 16)).toHaveLength(16);
    expect(exerciseCategory('chest').label).toBe('Pecho');
    expect(exerciseCategory('olympic').label).toBe('Halterofilia');
    expect(exerciseCategory('mobility').label).toBe('Movilidad y recuperación');
  });

  it('keeps custom unknown categories visible instead of dropping them', () => {
    expect(exerciseCategory('personalizada').label).toBe('personalizada');
  });
});
