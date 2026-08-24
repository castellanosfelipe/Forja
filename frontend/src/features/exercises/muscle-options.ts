export interface MuscleOption {
  id: string;
  label: string;
}

export interface MuscleOptionGroup {
  id: string;
  label: string;
  options: MuscleOption[];
}

export const MUSCLE_OPTION_GROUPS: MuscleOptionGroup[] = [
  {
    id: 'torso-front',
    label: 'Torso anterior y core',
    options: [
      { id: 'pectoralis-major', label: 'Pectoral mayor' },
      { id: 'serratus-anterior', label: 'Serrato anterior' },
      { id: 'abdominals', label: 'Abdominales' },
      { id: 'obliques', label: 'Oblicuos' },
    ],
  },
  {
    id: 'back',
    label: 'Espalda',
    options: [
      { id: 'latissimus-dorsi', label: 'Dorsal ancho' },
      { id: 'trapezius', label: 'Trapecio' },
      { id: 'rhomboids', label: 'Romboides' },
      { id: 'erector-spinae', label: 'Erectores espinales' },
      { id: 'thoracic-spine', label: 'Zona torácica' },
    ],
  },
  {
    id: 'upper-limbs',
    label: 'Hombros y brazos',
    options: [
      { id: 'anterior-deltoid', label: 'Deltoides anterior' },
      { id: 'lateral-deltoid', label: 'Deltoides lateral' },
      { id: 'posterior-deltoid', label: 'Deltoides posterior' },
      { id: 'rotator-cuff', label: 'Manguito rotador' },
      { id: 'biceps', label: 'Bíceps' },
      { id: 'brachialis', label: 'Braquial' },
      { id: 'triceps', label: 'Tríceps' },
      { id: 'forearms', label: 'Antebrazos' },
    ],
  },
  {
    id: 'lower-body',
    label: 'Cadera y piernas',
    options: [
      { id: 'gluteus-maximus', label: 'Glúteo mayor' },
      { id: 'gluteus-medius', label: 'Glúteo medio' },
      { id: 'hip-flexors', label: 'Flexores de cadera' },
      { id: 'quadriceps', label: 'Cuádriceps' },
      { id: 'hamstrings', label: 'Isquiotibiales' },
      { id: 'adductors', label: 'Aductores' },
      { id: 'abductors', label: 'Abductores' },
      { id: 'calves', label: 'Pantorrillas' },
      { id: 'tibialis-anterior', label: 'Tibial anterior' },
    ],
  },
];

export const MUSCLE_OPTIONS = MUSCLE_OPTION_GROUPS.flatMap((group) => group.options);

export function muscleLabel(id: string): string {
  return MUSCLE_OPTIONS.find((option) => option.id === id)?.label ?? id;
}
