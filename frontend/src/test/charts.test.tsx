import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { buildTrainingHeatmap, TrainingHeatmap } from '../components/charts/TrainingHeatmap';
import { WeightChart } from '../components/charts/WeightChart';
import { MuscleMap, calculateRecentMuscleScores } from '../components/muscle-map/MuscleMap';
import type { Exercise, WorkoutSession } from '../types/state';

describe('dashboard charts', () => {
  it('positions weight points by elapsed time instead of entry index', () => {
    const view = render(<WeightChart targetKg={null} entries={[
      { id: 'a', measuredAt: '2026-01-01T12:00:00Z', weightKg: 82, note: null },
      { id: 'b', measuredAt: '2026-01-02T12:00:00Z', weightKg: 81, note: null },
      { id: 'c', measuredAt: '2026-09-09T12:00:00Z', weightKg: 80, note: null },
    ]} />);
    const xs = [...view.container.querySelectorAll('.weight-point')].map((point) => Number(point.getAttribute('cx')));
    expect(xs[1]! - xs[0]!).toBeLessThan((xs[2]! - xs[1]!) / 10);
    expect(xs.every(Number.isFinite)).toBe(true);
  });

  it('offers named HTML controls and a textual alternative for every weight point', () => {
    const view = render(<WeightChart targetKg={78} entries={[
      { id: 'a', measuredAt: '2026-08-17T11:00:00.000Z', weightKg: 82.4, note: null },
      { id: 'b', measuredAt: '2026-08-24T11:00:00.000Z', weightKg: 81.9, note: null },
    ]} />);

    expect(screen.getByText(/2 mediciones representadas/i).textContent).toMatch(/último peso: 81[,.]9 kg/i);
    const list = screen.getByRole('list', { name: /mediciones de la gráfica/i });
    const controls = within(list).getAllByRole('button');
    expect(controls).toHaveLength(2);
    expect(controls[0]!.getAttribute('aria-label')).toMatch(/81[,.]9 kg.*punto 2 de 2/i);
    expect(controls[1]!.getAttribute('aria-label')).toMatch(/82[,.]4 kg.*punto 1 de 2/i);
    expect(view.container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(view.container.querySelector('circle[role]')).toBeNull();

    fireEvent.focus(controls[0]!);
    expect(controls[0]!.classList.contains('active')).toBe(true);
    expect(view.container.querySelector('.chart-tooltip')).toBeTruthy();
  });

  it('renders exactly 365 real days plus separate weekly-alignment padding', () => {
    const today = new Date(2026, 7, 26, 12);
    const baseline = buildTrainingHeatmap([], today);
    const beforeStart = new Date(baseline.days[0]!.date);
    beforeStart.setDate(beforeStart.getDate() - 1);
    const inRange = sessionOn(baseline.days[0]!.key, 'start');
    const todaySession = sessionOn(baseline.days.at(-1)!.key, 'today');
    const outside = sessionOn(localKey(beforeStart), 'outside');
    const cancelled = { ...sessionOn(baseline.days.at(-1)!.key, 'cancelled'), status: 'cancelled' as const };
    const result = buildTrainingHeatmap([inRange, todaySession, outside, cancelled], today);

    expect(result.days).toHaveLength(365);
    expect(result.slots).toHaveLength(371);
    expect(result.leadingPadding).toBe(2);
    expect(result.trailingPadding).toBe(4);
    expect(result.total).toBe(2);
    expect(result.slots.filter((slot) => slot === null)).toHaveLength(6);
  });

  it('counts only completed in-range sessions and exposes a concise accessible summary and legend', () => {
    const today = new Date();
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const session: WorkoutSession = { id: 's', planDayId: null, scheduledDate: key, startedAt: today.toISOString(), completedAt: today.toISOString(), status: 'completed', exercises: [], notes: null };
    const view = render(<TrainingHeatmap sessions={[session]} />);

    expect(view.container.querySelector('.card-heading > strong')?.textContent).toContain('1 sesión');
    expect(screen.getByText(/1 sesión completada, distribuida en 1 día con entrenamiento/i).classList.contains('sr-only')).toBe(true);
    expect(screen.getByRole('region', { name: /actividad diaria/i })).toBeTruthy();
    const legend = screen.getByRole('list', { name: /escala de sesiones por día/i });
    expect(within(legend).getAllByRole('listitem')).toHaveLength(5);
    expect(within(legend).getByText('4 o más sesiones')).toBeTruthy();
    expect(view.container.querySelectorAll('[data-heatmap-day]')).toHaveLength(365);
    expect(view.container.querySelectorAll('[data-heatmap-padding]')).toHaveLength(6);
  });

  it('weights completed sets by primary and secondary muscle involvement', () => {
    const exercise = exerciseFixture();
    const session = sessionFixture();
    const { scores, sessionCount } = calculateRecentMuscleScores([session], [exercise]);

    expect(sessionCount).toBe(1);
    expect(scores.get('pectoralis-major')).toBe(4);
    expect(scores.get('triceps')).toBe(2);
  });

  it('renders distinct female and male anatomy from the saved profile', () => {
    const exercise = exerciseFixture();
    const session = sessionFixture();
    const view = render(<MuscleMap sessions={[session]} exercises={[exercise]} sex="female" />);

    expect(screen.getByRole('img', { name: /mapa muscular de anatomía femenina/i })).toBeTruthy();
    expect(view.container.querySelectorAll('.anatomy-female')).toHaveLength(2);
    expect(view.container.querySelector('[data-muscle="pectoralis-major"]')?.getAttribute('class')).toContain('level-4');

    view.rerender(<MuscleMap sessions={[session]} exercises={[exercise]} sex="male" />);
    expect(screen.getByRole('img', { name: /mapa muscular de anatomía masculina/i })).toBeTruthy();
    expect(view.container.querySelectorAll('.anatomy-male')).toHaveLength(2);
  });
});

function exerciseFixture(): Exercise {
  return { id: 'press', name: 'Press', category: 'chest', equipment: ['barra'], measurement: 'repetitions', isBodyweight: false, isPerSide: false, muscles: { primary: ['pectoralis-major'], secondary: ['triceps'] } };
}

function sessionFixture(): WorkoutSession {
  const completedAt = '2026-08-24T12:00:00.000Z';
  return {
    id: 'session',
    planDayId: null,
    scheduledDate: '2026-08-24',
    startedAt: '2026-08-24T11:00:00.000Z',
    completedAt,
    status: 'completed',
    notes: null,
    exercises: [{
      exerciseId: 'press',
      estimatedOneRepMaxKg: 90,
      notes: null,
      sets: [
        { setNumber: 1, loadKg: 70, repetitions: 8, durationSeconds: null, side: null, rpe: 8, rir: 2, completedAt },
        { setNumber: 2, loadKg: 70, repetitions: 8, durationSeconds: null, side: null, rpe: 8.5, rir: 1, completedAt },
        { setNumber: 3, loadKg: 70, repetitions: 8, durationSeconds: null, side: null, rpe: null, rir: null, completedAt: null },
      ],
    }],
  };
}

function sessionOn(scheduledDate: string, id: string): WorkoutSession {
  return {
    id,
    planDayId: null,
    scheduledDate,
    startedAt: `${scheduledDate}T10:00:00.000Z`,
    completedAt: `${scheduledDate}T11:00:00.000Z`,
    status: 'completed',
    exercises: [],
    notes: null,
  };
}

function localKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
