import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
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
  it('preserves a newer RIR draft while an earlier RPE save is acknowledged', () => {
    let acknowledge: (() => void) | undefined;
    function Parent() {
      const [stored, setStored] = useState(set);
      return <SetRow set={stored} exercise={exercise} showRpe showRir onSave={(next) => { acknowledge = () => setStored(next); }} />;
    }
    render(<Parent />);
    const rpe = screen.getByRole('spinbutton', { name: 'Esfuerzo percibido RPE, serie 2' });
    const rir = screen.getByRole('spinbutton', { name: 'Repeticiones en reserva RIR, serie 2' }) as HTMLInputElement;
    fireEvent.change(rpe, { target: { value: '8' } });
    fireEvent.blur(rpe);
    fireEvent.change(rir, { target: { value: '2' } });
    act(() => acknowledge!());
    expect(rir.value).toBe('2');
  });

  it.each([
    ['Carga en kilogramos, serie 2', '-10'],
    ['Repeticiones, serie 2', '1.5'],
    ['Esfuerzo percibido RPE, serie 2', '12'],
    ['Repeticiones en reserva RIR, serie 2', '1.5'],
  ])('rejects invalid %s before autosave and completion', (name, value) => {
    const onSave = vi.fn();
    render(<SetRow set={set} exercise={exercise} showRpe showRir onSave={onSave} />);
    const input = screen.getByRole('spinbutton', { name });
    fireEvent.change(input, { target: { value } });
    fireEvent.blur(input);
    fireEvent.click(screen.getByRole('button', { name: 'Completar serie 2' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeTruthy();
  });

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
