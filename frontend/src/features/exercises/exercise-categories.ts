export interface ExerciseCategoryDefinition {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
}

export const EXERCISE_CATEGORIES: ExerciseCategoryDefinition[] = [
  { id: 'chest', label: 'Pecho', shortLabel: 'Pecho', description: 'Presses, aperturas y flexiones.' },
  { id: 'back', label: 'Espalda', shortLabel: 'Espalda', description: 'Remos, jalones, dominadas y bisagras.' },
  { id: 'shoulders', label: 'Hombros y trapecio', shortLabel: 'Hombros', description: 'Presses y elevaciones para deltoides y trapecio.' },
  { id: 'biceps', label: 'Bíceps', shortLabel: 'Bíceps', description: 'Flexiones de codo con barra, mancuernas y polea.' },
  { id: 'triceps', label: 'Tríceps', shortLabel: 'Tríceps', description: 'Fondos, extensiones y presses cerrados.' },
  { id: 'forearms', label: 'Antebrazos y agarre', shortLabel: 'Agarre', description: 'Muñeca, agarre y transportes cargados.' },
  { id: 'quadriceps', label: 'Cuádriceps', shortLabel: 'Cuádriceps', description: 'Sentadillas, prensa, zancadas y extensiones.' },
  { id: 'hamstrings', label: 'Isquiotibiales', shortLabel: 'Isquios', description: 'Bisagras de cadera y curls femorales.' },
  { id: 'glutes', label: 'Glúteos', shortLabel: 'Glúteos', description: 'Empujes de cadera, puentes y extensiones.' },
  { id: 'adductors-abductors', label: 'Aductores y abductores', shortLabel: 'Cadera', description: 'Trabajo lateral y estabilidad de cadera.' },
  { id: 'calves', label: 'Pantorrillas y tibial', shortLabel: 'Pantorrillas', description: 'Flexión plantar y trabajo del tibial.' },
  { id: 'core', label: 'Core', shortLabel: 'Core', description: 'Antiextensión, antirotación, flexión y estabilidad.' },
  { id: 'full-body', label: 'Cuerpo completo', shortLabel: 'Cuerpo completo', description: 'Potencia, transportes y acondicionamiento global.' },
  { id: 'olympic', label: 'Halterofilia', shortLabel: 'Halterofilia', description: 'Cargadas, arrancadas, enviones y tirones.' },
  { id: 'cardio', label: 'Cardio', shortLabel: 'Cardio', description: 'Máquinas y movimientos de resistencia cardiovascular.' },
  { id: 'mobility', label: 'Movilidad y recuperación', shortLabel: 'Movilidad', description: 'Movilidad articular, estiramientos y liberación.' },
  { id: 'strength', label: 'Fuerza general', shortLabel: 'Fuerza', description: 'Ejercicios personalizados de fuerza.' },
  { id: 'mobility-conditioning', label: 'Acondicionamiento', shortLabel: 'Acondicionamiento', description: 'Ejercicios personalizados de movilidad o condición.' },
];

const CATEGORY_BY_ID = new Map(EXERCISE_CATEGORIES.map((category) => [category.id, category]));

export function exerciseCategory(categoryId: string): ExerciseCategoryDefinition {
  return CATEGORY_BY_ID.get(categoryId) ?? {
    id: categoryId,
    label: categoryId || 'Sin categoría',
    shortLabel: categoryId || 'Sin categoría',
    description: 'Ejercicios personalizados.',
  };
}
