import { describe, expect, it } from 'vitest';
import { generateRoutine } from '../features/onboarding/routine-generator';
import type { Exercise, OnboardingProfile } from '../types/state';

const IDS = [
  'leg-press', 'chest-press-machine', 'seated-cable-row', 'lying-leg-curl', 'dumbbell-lateral-raise', 'front-plank',
  'machine-hip-thrust', 'lat-pulldown', 'incline-dumbbell-press', 'leg-extension', 'face-pull', 'dead-bug',
  'hack-squat', 'machine-row', 'machine-shoulder-press', 'seated-leg-curl', 'cable-fly', 'pallof-press',
  'landmine-press', 'glute-bridge', 'single-leg-glute-bridge', 'pec-deck', 'straight-arm-pulldown',
] as const;

const CATEGORY: Record<string, string> = {
  'leg-press': 'quadriceps', 'lying-leg-curl': 'hamstrings', 'machine-hip-thrust': 'glutes', 'leg-extension': 'quadriceps',
  'hack-squat': 'quadriceps', 'seated-leg-curl': 'hamstrings', 'front-plank': 'core', 'dead-bug': 'core', 'pallof-press': 'core',
  'chest-press-machine': 'chest', 'incline-dumbbell-press': 'chest', 'cable-fly': 'chest', 'pec-deck': 'chest',
  'seated-cable-row': 'back', 'lat-pulldown': 'back', 'machine-row': 'back', 'straight-arm-pulldown': 'back',
  'dumbbell-lateral-raise': 'shoulders', 'face-pull': 'shoulders', 'machine-shoulder-press': 'shoulders', 'landmine-press': 'shoulders',
};

const LIBRARY: Exercise[] = IDS.map((id) => ({
  id,
  name: id,
  category: CATEGORY[id] ?? 'glutes',
  equipment: ['máquina'],
  measurement: ['front-plank', 'dead-bug'].includes(id) ? 'duration' : 'repetitions',
  isBodyweight: false,
  isPerSide: false,
  muscles: { primary: [], secondary: [] },
}));

const BASE_PROFILE: OnboardingProfile = {
  completedAt: '2026-08-24T00:00:00.000Z',
  trainingGoal: 'hypertrophy',
  experience: 'beginner',
  trainingDaysPerWeek: 3,
  sessionMinutes: 60,
  equipment: 'full-gym',
  priorityMuscles: [],
  limitations: [],
  generatedAt: '2026-08-24T00:00:00.000Z',
  methodologyVersion: 'forja-safe-v1',
};

describe('generateRoutine', () => {
  it('crea un plan de cuerpo completo con tempo, RPE y progresión lineal para principiantes', () => {
    const generated = generateRoutine(BASE_PROFILE, LIBRARY, '2026-08-24');
    const prescriptions = generated.plan.days.flatMap((day) => day.blocks.flatMap((block) => block.exercises));

    expect(generated.plan.days).toHaveLength(3);
    expect(generated.plan.days.map((day) => day.weekday)).toEqual([1, 3, 5]);
    expect(generated.plan.days.every((day) => day.blocks.every((block) => block.type === 'standard'))).toBe(true);
    expect(prescriptions.every((item) => item.targetRpe === 7)).toBe(true);
    expect(prescriptions.every((item) => item.tempo?.eccentricSeconds === 3)).toBe(true);
    expect(generated.progressionRules.every((rule) => rule.strategy === 'linear-progression')).toBe(true);
  });

  it('usa superseries de accesorios y doble progresión en hipertrofia intermedia', () => {
    const generated = generateRoutine({ ...BASE_PROFILE, experience: 'intermediate' }, LIBRARY, '2026-08-24');

    expect(generated.plan.days.every((day) => day.blocks.some((block) => block.type === 'superset'))).toBe(true);
    expect(generated.progressionRules.every((rule) => rule.strategy === 'double-progression')).toBe(true);
  });

  it('limita el número de ejercicios según la duración disponible', () => {
    const generated = generateRoutine({ ...BASE_PROFILE, sessionMinutes: 30 }, LIBRARY, '2026-08-24');
    const counts = generated.plan.days.map((day) => day.blocks.flatMap((block) => block.exercises).length);

    expect(Math.max(...counts)).toBeLessThanOrEqual(4);
  });

  it('sustituye movimientos demandantes cuando se informa una limitación de rodilla', () => {
    const generated = generateRoutine({ ...BASE_PROFILE, limitations: ['knee'] }, LIBRARY, '2026-08-24');
    const exerciseIds = generated.plan.days.flatMap((day) => day.blocks.flatMap((block) => block.exercises.map((item) => item.exerciseId)));

    expect(exerciseIds).not.toContain('leg-press');
    expect(exerciseIds).not.toContain('hack-squat');
    expect(exerciseIds).not.toContain('leg-extension');
  });

  it('reduce el volumen base para mayores de 55 sin bajar de dos series', () => {
    const profile = { ...BASE_PROFILE, experience: 'intermediate' as const };
    const standard = generateRoutine(profile, LIBRARY, '2026-08-24', { ageYears: 40 });
    const adjusted = generateRoutine(profile, LIBRARY, '2026-08-24', { ageYears: 60 });
    const firstStandard = standard.plan.days[0]?.blocks[0]?.exercises[0]?.sets;
    const firstAdjusted = adjusted.plan.days[0]?.blocks[0]?.exercises[0]?.sets;

    expect(firstStandard).toBe(3);
    expect(firstAdjusted).toBe(2);
  });
});
