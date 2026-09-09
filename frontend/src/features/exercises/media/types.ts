export interface ExerciseMediaMapping {
  /** Stable FORJA exercise identifier. */
  id: string;
  /** Exact exercise identifier in the licensed source catalog. */
  sourceId: string;
}

export type ExerciseMediaSource = 'repdb' | 'free-exercise-db' | 'forja';

export type ExerciseMediaFrameLabel = 'Inicio' | 'Punto clave' | 'Rotación' | 'Final' | 'Demostración' | 'Secuencia';

export interface ExerciseMediaFrame {
  src: string;
  label: ExerciseMediaFrameLabel;
}

export interface ExerciseMedia extends ExerciseMediaMapping {
  source: ExerciseMediaSource;
  frames: ExerciseMediaFrame[];
  description?: string;
  instructions: string[];
  tips: string[];
}

export interface ExerciseGuidance {
  description: string;
  instructions: string[];
  tips: string[];
}
