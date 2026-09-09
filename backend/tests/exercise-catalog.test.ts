import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GYM_EXERCISE_CATALOG, GYM_EXERCISE_IDS } from '../src/domain/exercise-catalog.js';

interface ExerciseMediaRecord {
  id: string;
  source: string;
  sourceId: string;
  frames: Array<{ src: string; label: string }>;
}

describe('gym exercise catalog', () => {
  it('contains a unique and categorized comprehensive base library', () => {
    const categories = new Set(GYM_EXERCISE_CATALOG.map((exercise) => exercise.category));

    expect(GYM_EXERCISE_CATALOG).toHaveLength(195);
    expect(GYM_EXERCISE_IDS.size).toBe(GYM_EXERCISE_CATALOG.length);
    expect(categories.size).toBe(16);
    expect(categories).toEqual(new Set([
      'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms', 'quadriceps', 'hamstrings',
      'glutes', 'adductors-abductors', 'calves', 'core', 'full-body', 'olympic', 'cardio', 'mobility',
    ]));
  });

  it('keeps every entry usable by the workout data model', () => {
    for (const exercise of GYM_EXERCISE_CATALOG) {
      expect(exercise.id).toMatch(/^[a-z0-9-]+$/);
      expect(exercise.name.trim().length).toBeGreaterThan(3);
      expect(exercise.muscles.primary.length).toBeGreaterThan(0);
      expect(['repetitions', 'duration']).toContain(exercise.measurement);
    }
  });

  it('has one exact, local and readable visual mapping per catalog exercise', () => {
    const registryUrl = new URL('../../frontend/src/features/exercises/media/registry.json', import.meta.url);
    const publicUrl = new URL('../../frontend/public/', import.meta.url);
    const registry = JSON.parse(readFileSync(registryUrl, 'utf8')) as ExerciseMediaRecord[];
    const mappedIds = new Set(registry.map((media) => media.id));
    const sourceAssignments = new Set(registry.map((media) => `${media.source}:${media.sourceId}`));

    expect(registry).toHaveLength(GYM_EXERCISE_CATALOG.length);
    expect(mappedIds).toEqual(GYM_EXERCISE_IDS);
    expect(sourceAssignments.size).toBe(registry.length);

    const frameHashes = new Set<string>();
    let frameCount = 0;
    for (const media of registry) {
      expect(['repdb', 'free-exercise-db', 'forja']).toContain(media.source);
      expect(media.frames.length).toBeGreaterThan(0);
      for (const frame of media.frames) {
        expect(frame.src).toMatch(/^\/exercise-media\/.+\.(?:webp|jpe?g|png)$/);
        const assetUrl = new URL(frame.src.slice(1), publicUrl);
        expect(existsSync(assetUrl), `${media.id}: falta ${frame.src}`).toBe(true);
        expect(statSync(assetUrl).size, `${media.id}: ${frame.src} está vacío`).toBeGreaterThan(0);
        frameHashes.add(createHash('sha256').update(readFileSync(assetUrl)).digest('hex'));
        frameCount += 1;
      }
    }
    expect(frameHashes.size, 'No debe repetirse ningún archivo visual').toBe(frameCount);
  });
});
