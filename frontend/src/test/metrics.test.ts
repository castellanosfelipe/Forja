import { describe, expect, it } from 'vitest';
import { calculateBodyMetrics, type BodyMetricInput } from '../features/metrics/calculations';

const base: BodyMetricInput = {
  sex: 'male',
  ageYears: 30,
  heightCm: 180,
  weightKg: 80,
  activityLevel: 'moderate',
  goal: 'maintain',
  neckCm: 40,
  waistCm: 90,
  hipCm: null,
};

describe('calculadoras corporales', () => {
  it('rejects a calorie budget that cannot accommodate its own macronutrient allocation', () => {
    expect(() => calculateBodyMetrics({ ...base, sex: 'female', ageYears: 100, heightCm: 100, weightKg: 20, activityLevel: 'sedentary', goal: 'lose', neckCm: null, waistCm: null }))
      .toThrow('energía calculada');
  });

  it('encadena IMC, grasa, energía y macros con valores reproducibles', () => {
    const result = calculateBodyMetrics(base);

    expect(result.bmi).toBe(24.7);
    expect(result.bodyFatPercent).toBe(18.4);
    expect(result.leanMassKg).toBe(65.3);
    expect(result.ffmi).toBe(20.2);
    expect(result.basalMetabolicRateKcal).toBe(1780);
    expect(result.totalDailyEnergyExpenditureKcal).toBe(2759);
    expect(result.macros).toMatchObject({ proteinGrams: 144, fatGrams: 92, carbohydrateGrams: 339 });
  });

  it('permite calcular IMC y energía sin perímetros', () => {
    const result = calculateBodyMetrics({ ...base, neckCm: null, waistCm: null });

    expect(result.bodyFatPercent).toBeNull();
    expect(result.ffmi).toBeNull();
    expect(result.bmi).toBe(24.7);
  });

  it('exige cadera cuando se inicia la estimación femenina por perímetros', () => {
    expect(() => calculateBodyMetrics({ ...base, sex: 'female', hipCm: null }))
      .toThrow('La medida de cadera es necesaria');
  });
});
