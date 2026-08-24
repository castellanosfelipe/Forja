import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SetRow } from '../components/workout/SetRow';
import type { Exercise, WorkoutSet } from '../types/state';

const exercise: Exercise = {
  id: 'squat',
  name: 'Sentadilla',
  category: 'quadriceps',
  equipment: ['barra'],
  measurement: 'repetitions',
  isBodyweight: false,
  isPerSide: false,
  muscles: { primary: ['quadriceps'], secondary: ['gluteus-maximus'] },
};

const set: WorkoutSet = {
  setNumber: 2,
  loadKg: 60,
  repetitions: 5,
  durationSeconds: null,
  side: null,
  rpe: null,
  rir: null,
  completedAt: null,
};

describe('SetRow', () => {
  it('uses unique field names and prevents completing invalid series', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<SetRow set={set} exercise={exercise} showRpe showRir onSave={onSave} />);

    const repetitions = screen.getByRole('spinbutton', { name: 'Repeticiones, serie 2' });
    expect(screen.getByRole('spinbutton', { name: 'Carga en kilogramos, serie 2' })).toBeTruthy();
    await user.clear(repetitions);
    await user.click(screen.getByRole('button', { name: 'Completar serie 2' }));
    expect(screen.getByRole('alert').textContent).toContain('al menos una repetición');
    expect(document.activeElement).toBe(repetitions);
    expect(onSave.mock.calls.some((call) => call[1] === true)).toBe(false);

    await user.type(repetitions, '5');
    const rpe = screen.getByRole('spinbutton', { name: 'Esfuerzo percibido RPE, serie 2' });
    await user.type(rpe, '12');
    await user.click(screen.getByRole('button', { name: 'Completar serie 2' }));
    expect(screen.getByRole('alert').textContent).toContain('esfuerzo percibido');
    expect(document.activeElement).toBe(rpe);

    await user.clear(rpe);
    await user.type(rpe, '8');
    await user.click(screen.getByRole('button', { name: 'Completar serie 2' }));
    expect(onSave.mock.calls.some((call) => call[1] === true)).toBe(true);
  });
});
