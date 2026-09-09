import registry from './registry.json';
import type { ExerciseMedia } from './types';

export const EXERCISE_MEDIA = registry as ExerciseMedia[];

const mediaByExerciseId = new Map(EXERCISE_MEDIA.map((media) => [media.id, media]));

export function getExerciseMedia(exerciseId: string): ExerciseMedia | undefined {
  return mediaByExerciseId.get(exerciseId);
}
