import type { ActivityLevel, BiologicalSex, BodyGoal, MacroTargets } from '../../types/state';

export interface BodyMetricInput {
  sex: BiologicalSex;
  ageYears: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: BodyGoal;
  neckCm: number | null;
  waistCm: number | null;
  hipCm: number | null;
}

export interface BodyMetricResult {
  bmi: number;
  bmiCategory: string;
  healthyWeightRangeKg: { min: number; max: number };
  bodyFatPercent: number | null;
  bodyFatCategory: string | null;
  leanMassKg: number | null;
  ffmi: number | null;
  basalMetabolicRateKcal: number;
  totalDailyEnergyExpenditureKcal: number;
  targetCaloriesKcal: number;
  macros: MacroTargets;
}

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  'very-active': 1.9,
};

const PROTEIN_GRAMS_PER_KG: Record<BodyGoal, number> = {
  lose: 2.2,
  maintain: 1.8,
  gain: 2,
};

const FAT_RATIO: Record<BodyGoal, number> = {
  lose: 0.25,
  maintain: 0.3,
  gain: 0.25,
};

const CALORIE_RATIO: Record<BodyGoal, number> = {
  lose: 0.85,
  maintain: 1,
  gain: 1.1,
};

export function calculateBodyMetrics(input: BodyMetricInput): BodyMetricResult {
  assertRange(input.ageYears, 18, 100, 'La edad debe estar entre 18 y 100 años.');
  assertRange(input.heightCm, 100, 250, 'La altura debe estar entre 100 y 250 cm.');
  assertRange(input.weightKg, 20, 500, 'El peso debe estar entre 20 y 500 kg.');

  const heightM = input.heightCm / 100;
  const bmi = input.weightKg / heightM ** 2;
  const bodyFatPercent = calculateBodyFat(input);
  const leanMassKg = bodyFatPercent === null ? null : input.weightKg * (1 - bodyFatPercent / 100);
  const ffmi = leanMassKg === null ? null : leanMassKg / heightM ** 2;
  const sexConstant = input.sex === 'male' ? 5 : -161;
  const basalMetabolicRateKcal = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.ageYears + sexConstant;
  const totalDailyEnergyExpenditureKcal = basalMetabolicRateKcal * ACTIVITY_FACTORS[input.activityLevel];
  const targetCaloriesKcal = Math.round(totalDailyEnergyExpenditureKcal * CALORIE_RATIO[input.goal]);
  const macros = calculateMacros(input.weightKg, targetCaloriesKcal, input.goal);

  return {
    bmi: round(bmi, 1),
    bmiCategory: bmiCategory(bmi),
    healthyWeightRangeKg: {
      min: round(18.5 * heightM ** 2, 1),
      max: round(24.9 * heightM ** 2, 1),
    },
    bodyFatPercent: bodyFatPercent === null ? null : round(bodyFatPercent, 1),
    bodyFatCategory: bodyFatPercent === null ? null : bodyFatCategory(input.sex, bodyFatPercent),
    leanMassKg: leanMassKg === null ? null : round(leanMassKg, 1),
    ffmi: ffmi === null ? null : round(ffmi, 1),
    basalMetabolicRateKcal: Math.round(basalMetabolicRateKcal),
    totalDailyEnergyExpenditureKcal: Math.round(totalDailyEnergyExpenditureKcal),
    targetCaloriesKcal,
    macros,
  };
}

function calculateBodyFat(input: BodyMetricInput): number | null {
  const hasAnyCircumference = input.neckCm !== null || input.waistCm !== null || input.hipCm !== null;
  if (!hasAnyCircumference) return null;
  if (input.neckCm === null || input.waistCm === null) {
    throw new Error('Completa cuello y cintura para estimar la grasa corporal.');
  }
  assertRange(input.neckCm, 20, 80, 'La medida del cuello debe estar entre 20 y 80 cm.');
  assertRange(input.waistCm, 40, 250, 'La medida de la cintura debe estar entre 40 y 250 cm.');
  if (input.waistCm <= input.neckCm) throw new Error('La cintura debe ser mayor que el cuello.');

  let density: number;
  if (input.sex === 'male') {
    density = 1.0324 - 0.19077 * Math.log10(input.waistCm - input.neckCm) + 0.15456 * Math.log10(input.heightCm);
  } else {
    if (input.hipCm === null) throw new Error('La medida de cadera es necesaria para esta estimación.');
    assertRange(input.hipCm, 40, 250, 'La medida de la cadera debe estar entre 40 y 250 cm.');
    density = 1.29579 - 0.35004 * Math.log10(input.waistCm + input.hipCm - input.neckCm) + 0.221 * Math.log10(input.heightCm);
  }
  const percentage = 495 / density - 450;
  if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 70) {
    throw new Error('Los perímetros no producen una estimación válida. Revisa las medidas.');
  }
  return percentage;
}

function calculateMacros(weightKg: number, calories: number, goal: BodyGoal): MacroTargets {
  const proteinGrams = Math.round(weightKg * PROTEIN_GRAMS_PER_KG[goal]);
  const proteinCalories = proteinGrams * 4;
  const fatCalories = Math.round(calories * FAT_RATIO[goal]);
  if (proteinCalories + fatCalories > calories) {
    throw new Error('Revisa los datos y el objetivo: la energía calculada no permite distribuir los nutrientes de forma coherente.');
  }
  const fatGrams = Math.round(fatCalories / 9);
  const carbohydrateCalories = Math.max(0, calories - proteinCalories - fatCalories);
  const carbohydrateGrams = Math.round(carbohydrateCalories / 4);
  const total = proteinCalories + fatCalories + carbohydrateCalories;
  const proteinPercent = Math.round(proteinCalories / total * 100);
  const fatPercent = Math.round(fatCalories / total * 100);
  return {
    proteinGrams,
    fatGrams,
    carbohydrateGrams,
    proteinPercent,
    fatPercent,
    carbohydratePercent: 100 - proteinPercent - fatPercent,
  };
}

function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return 'Bajo peso';
  if (bmi < 25) return 'Rango habitual';
  if (bmi < 30) return 'Sobrepeso';
  return 'Obesidad';
}

function bodyFatCategory(sex: BiologicalSex, percentage: number): string {
  if (sex === 'male') {
    if (percentage < 5) return 'Muy bajo';
    if (percentage <= 13) return 'Atlético';
    if (percentage <= 24) return 'Rango general';
    return 'Elevado';
  }
  if (percentage < 12) return 'Muy bajo';
  if (percentage <= 22) return 'Atlético';
  if (percentage <= 31) return 'Rango general';
  return 'Elevado';
}

function assertRange(value: number, min: number, max: number, message: string): void {
  if (!Number.isFinite(value) || value < min || value > max) throw new Error(message);
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
