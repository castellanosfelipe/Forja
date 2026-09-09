import type { ExerciseMediaFrameLabel, ExerciseMediaMapping, ExerciseMediaSource } from './types';
import { FORJA_GENERATED_GUIDANCE } from './generated-guidance';

export interface ExerciseMediaSourceMapping extends ExerciseMediaMapping {
  source: ExerciseMediaSource;
}

interface FreeExerciseDbMediaOverride {
  frameOrder?: readonly number[];
  frameLabels?: readonly ExerciseMediaFrameLabel[];
  supplementalRepDbFrames?: readonly {
    sourceId: string;
    phase: 'start' | 'peak' | 'main';
    label: ExerciseMediaFrameLabel;
  }[];
}

/**
 * Aliases are deliberately explicit. An exercise must never inherit media from
 * its category or from a fuzzy name match.
 */
export const REPDB_ALIASES: Readonly<Record<string, string>> = {
  'dumbbell-bench-press': 'db-bench-press',
  'incline-dumbbell-press': 'incline-db-press',
  'dumbbell-fly': 'db-fly',
  'incline-push-up': 'incline-push-ups',
  'conventional-deadlift': 'deadlift',
  'single-arm-dumbbell-row': 'single-arm-db-row',
  'chest-supported-dumbbell-row': 'chest-supported-db-row',
  'wide-grip-cable-row': 'wide-grip-seated-cable-row',
  'chin-up': 'chin-ups',
  'neutral-grip-pull-up': 'neutral-grip-pull-ups',
  'assisted-pull-up': 'assisted-pull-ups',
  'neutral-grip-lat-pulldown': 'v-bar-lat-pulldown',
  'single-arm-lat-pulldown': 'one-arm-lat-pulldown',
  'dumbbell-pullover': 'db-pullover',
  'overhead-press': 'ohp',
  'seated-barbell-press': 'seated-barbell-overhead-press',
  'dumbbell-lateral-raise': 'lateral-raise',
  'machine-lateral-raise': 'plate-loaded-lateral-raise',
  'barbell-upright-row': 'upright-row',
  'dumbbell-shrug': 'db-shrug',
  'barbell-shrug': 'shrug',
  'dumbbell-curl': 'bicep-curl',
  'incline-dumbbell-curl': 'incline-db-curl',
  'machine-biceps-curl': 'machine-bicep-curl',
  'assisted-dip': 'assisted-dips',
  'dumbbell-overhead-triceps-extension': 'overhead-tricep-extension',
  'cable-triceps-pushdown': 'tricep-pushdown',
  'single-arm-triceps-pushdown': 'single-arm-tricep-pushdown',
  'dumbbell-kickback': 'tricep-kickback',
  'reverse-barbell-curl': 'reverse-curl',
  'farmer-carry': 'dumbbell-farmers-walk',
  'back-squat': 'squat',
  'forward-lunge': 'db-lunge',
  'lying-leg-curl': 'leg-curl',
  'nordic-curl': 'nordic-hamstring-curl',
  'barbell-hip-thrust': 'hip-thrust',
  'machine-hip-thrust': 'plate-loaded-glute-drive',
  'hip-abduction-machine': 'hip-abduction',
  'hip-adduction-machine': 'hip-adduction',
  'band-lateral-walk': 'banded-lateral-walk',
  'lateral-lunge': 'side-lunge',
  'smith-calf-raise': 'smith-machine-calf-raise',
  'front-plank': 'plank',
  crunch: 'crunches',
  'reverse-crunch': 'reverse-crunches',
  'pallof-press': 'cable-pallof-press',
  'barbell-thruster': 'thruster',
  burpee: 'burpees',
  'treadmill-run': 'treadmill-running',
  elliptical: 'elliptical-trainer',
  'rowing-ergometer': 'rowing-machine',
  'hip-flexor-stretch': 'kneeling-hip-flexor-stretch',
  'quadriceps-stretch': 'standing-quad-stretch',
  'calf-stretch': 'standing-calf-stretch',
  'pec-doorway-stretch': 'doorway-chest-stretch',
  'lat-stretch-bench': 'bench-lat-stretch',
  'thoracic-rotation': 'thread-the-needle',
  'deep-squat-hold': 'garland-pose',
};

export const FREE_EXERCISE_DB_MAPPINGS: Readonly<Record<string, string>> = {
  'machine-row': 'Leverage_Iso_Row',
  'reverse-pec-deck': 'Reverse_Machine_Flyes',
  'rope-triceps-pushdown': 'Triceps_Pushdown_-_Rope_Attachment',
  'cable-overhead-triceps-extension': 'Cable_Rope_Overhead_Triceps_Extension',
  'reverse-wrist-curl': 'Palms-Down_Wrist_Curl_Over_A_Bench',
  'step-up': 'Dumbbell_Step_Ups',
  'standing-leg-curl': 'Standing_Leg_Curl',
  'glute-ham-raise': 'Glute_Ham_Raise',
  'cable-pull-through': 'Pull_Through',
  'reverse-hyperextension': 'Reverse_Hyperextension',
  'cable-hip-adduction': 'Cable_Hip_Adduction',
  'leg-press-calf-raise': 'Calf_Press_On_The_Leg_Press_Machine',
  'cable-woodchop': 'Standing_Cable_Wood_Chop',
  'sled-push': 'Sled_Push',
  'sled-pull': 'Sled_Drag_-_Harness',
  'power-clean': 'Power_Clean',
  'power-snatch': 'Power_Snatch',
  'hang-power-snatch': 'Hang_Snatch',
  'clean-pull': 'Clean_Pull',
  'snatch-pull': 'Snatch_Pull',
  'treadmill-walk': 'Walking_Treadmill',
  stepmill: 'Stairmaster',
  'worlds-greatest-stretch': 'Worlds_Greatest_Stretch',
  'hamstring-stretch': 'Hamstring_Stretch',
  'band-external-rotation': 'External_Rotation_with_Band',
  'foam-roll-quadriceps': 'Quadriceps-SMR',
  'foam-roll-upper-back': 'Rhomboids-SMR',
};

/**
 * Source datasets with an inverted or incomplete phase order are corrected
 * explicitly here. This is never inferred from filenames.
 */
export const FREE_EXERCISE_DB_MEDIA_OVERRIDES: Readonly<Record<string, FreeExerciseDbMediaOverride>> = {
  'step-up': {
    frameOrder: [1, 0],
    frameLabels: ['Inicio', 'Final'],
  },
  'sled-push': {
    frameLabels: ['Inicio', 'Punto clave'],
  },
  'snatch-pull': {
    frameLabels: ['Inicio', 'Punto clave'],
  },
  'worlds-greatest-stretch': {
    frameLabels: ['Inicio', 'Punto clave'],
    supplementalRepDbFrames: [
      { sourceId: 'revolved-crescent-lunge', phase: 'main', label: 'Rotación' },
    ],
  },
};

export const FORJA_GENERATED_MEDIA_IDS: ReadonlySet<string> = new Set([
  ...Object.keys(FORJA_GENERATED_GUIDANCE),
  'sled-pull',
  'power-clean',
  'power-snatch',
  'hang-power-snatch',
  'clean-pull',
  'stepmill',
]);
