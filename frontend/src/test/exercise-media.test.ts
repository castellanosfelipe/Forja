import { describe, expect, it } from 'vitest';
import { EXERCISE_MEDIA, getExerciseMedia } from '../features/exercises/media/exercise-media';

describe('exercise media registry', () => {
  it('contains one explicit, local mapping for every base catalog exercise', () => {
    expect(EXERCISE_MEDIA).toHaveLength(195);
    expect(new Set(EXERCISE_MEDIA.map((media) => media.id)).size).toBe(195);
    expect(new Set(EXERCISE_MEDIA.map((media) => `${media.source}:${media.sourceId}`)).size).toBe(195);

    for (const media of EXERCISE_MEDIA) {
      expect(media.frames.length).toBeGreaterThan(0);
      expect(media.description?.trim().length).toBeGreaterThan(0);
      expect(media.instructions.length).toBeGreaterThan(0);
      expect(media.tips.length).toBeGreaterThan(0);
      for (const frame of media.frames) {
        expect(frame.src).toMatch(/^\/exercise-media\/.+\.(?:webp|jpe?g|png)$/);
        expect(frame.src.endsWith('.gif')).toBe(false);
      }
    }
  });

  it('keeps similar exercises mapped to distinct demonstrations', () => {
    expect(getExerciseMedia('rowing-ergometer')?.sourceId).not.toBe(getExerciseMedia('stationary-bike')?.sourceId);
    expect(getExerciseMedia('chest-dip')?.sourceId).not.toBe(getExerciseMedia('bar-dip')?.sourceId);
    expect(getExerciseMedia('front-plank')?.sourceId).not.toBe(getExerciseMedia('dead-bug')?.sourceId);
  });

  it('returns no media for an unknown custom exercise', () => {
    expect(getExerciseMedia('custom-exercise')).toBeUndefined();
  });
});
