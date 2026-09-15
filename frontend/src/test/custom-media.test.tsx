import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExerciseMedia } from '../features/exercises/ExerciseMedia';
import { checkGuideCapacity, guideBytes, MAX_GUIDE_BYTES, MAX_GUIDES_BYTES, prepareGuideImage, validGuideImage } from '../features/exercises/custom-media';
import type { Exercise } from '../types/state';

const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1EAAAAASUVORK5CYII=';
const exercise: Exercise = { id: 'own', name: 'Mi ejercicio', category: 'chest', equipment: [], measurement: 'repetitions', isBodyweight: true, isPerSide: false, muscles: { primary: ['pectoralis-major'], secondary: [] }, guideMedia: { kind: 'image', dataUrl: png, alt: 'Inicio de pie, final con brazos elevados' } };

describe('custom exercise images', () => {
  it('renders the saved image with its accessible description', () => {
    render(<ExerciseMedia exercise={exercise} />);
    expect(screen.getByRole('img', { name: exercise.guideMedia!.alt }).getAttribute('src')).toBe(png);
  });
  it('rejects remote, SVG, broken and oversized inputs', () => {
    for (const url of ['https://example.com/exercise.png', 'data:image/svg+xml;base64,PHN2Zz4=', 'data:image/png;base64,!!!', `data:image/png;base64,${'A'.repeat(MAX_GUIDE_BYTES * 2)}`]) expect(validGuideImage(url)).toBe(false);
    expect(validGuideImage(png)).toBe(true);
    expect(guideBytes('data:image/png;base64,AA==')).toBe(1);
    expect(guideBytes('data:image/png;base64,AAA=')).toBe(2);
  });
  it('enforces aggregate capacity and credits a replaced image', () => {
    const large = { ...exercise.guideMedia!, dataUrl: `data:image/jpeg;base64,${'A'.repeat(MAX_GUIDE_BYTES * 4 / 3 + 4)}` };
    const fullCapacityCount = Math.floor(MAX_GUIDES_BYTES / MAX_GUIDE_BYTES);
    const library = Array.from({ length: fullCapacityCount }, (_, i) => ({ ...exercise, id: `${i}`, guideMedia: large }));
    expect(() => checkGuideCapacity(library, large)).toThrow(/espacio/);
    expect(() => checkGuideCapacity(library, exercise.guideMedia!, '0')).not.toThrow();
  });
  it('rejects unsupported uploads without decoding them', async () => {
    const decode = vi.fn();
    vi.stubGlobal('createImageBitmap', decode);
    try {
      await expect(prepareGuideImage(new File(['<svg/>'], 'fake.svg', { type: 'image/svg+xml' }))).rejects.toThrow(/PNG/);
      expect(decode).not.toHaveBeenCalled();
    } finally { vi.unstubAllGlobals(); }
  });
});
