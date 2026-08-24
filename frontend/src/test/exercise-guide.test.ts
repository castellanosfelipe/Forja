import { describe, expect, it } from 'vitest';
import { EXERCISE_CATEGORIES } from '../features/exercises/exercise-categories';
import { getExerciseGuide, movementPattern } from '../features/exercises/exercise-guide';
import type { Exercise } from '../types/state';

describe('exercise technique guides', () => {
  it('provides complete guidance for every supported and custom category', () => {
    for (const category of EXERCISE_CATEGORIES) {
      const exercise = makeExercise(category.id, `Ejercicio de ${category.label}`);
      const guide = getExerciseGuide(exercise);

      expect(guide.steps).toHaveLength(3);
      expect(guide.steps.every((step) => step.title.length > 0 && step.description.length > 20)).toBe(true);
      expect(guide.cues.length).toBeGreaterThanOrEqual(3);
      expect(guide.breathing.length).toBeGreaterThan(20);
      expect(guide.warning.length).toBeGreaterThan(20);
    }
  });

  it('distinguishes the main movement families used by the catalog', () => {
    const cases: Array<[string, string, ReturnType<typeof movementPattern>]> = [
      ['chest', 'Aperturas con mancuernas', 'fly'],
      ['back', 'Remo con barra', 'row'],
      ['back', 'Jalón al pecho', 'vertical-pull'],
      ['hamstrings', 'Peso muerto rumano', 'hinge'],
      ['quadriceps', 'Zancada inversa', 'lunge'],
      ['quadriceps', 'Extensión de cuádriceps', 'leg-extension'],
      ['glutes', 'Hip thrust con barra', 'hip-thrust'],
      ['core', 'Press Pallof', 'core-rotation'],
      ['shoulders', 'Press militar', 'vertical-press'],
      ['biceps', 'Curl con barra', 'curl'],
    ];

    for (const [category, name, expected] of cases) expect(movementPattern(makeExercise(category, name))).toBe(expected);
  });
});

function makeExercise(category: string, name: string): Exercise {
  return {
    id: name.toLowerCase().replaceAll(' ', '-'),
    name,
    category,
    equipment: [],
    measurement: category === 'cardio' || category === 'mobility-conditioning' ? 'duration' : 'repetitions',
    isBodyweight: false,
    isPerSide: false,
    muscles: { primary: [], secondary: [] },
  };
}
