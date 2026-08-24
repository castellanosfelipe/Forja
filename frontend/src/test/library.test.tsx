import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { LibraryPage } from '../features/exercises/LibraryPage';
import { useStateStore } from '../stores/state.store';
import type { UserState } from '../types/state';

afterEach(() => useStateStore.setState({ state: null }));

describe('categorized exercise library', () => {
  it('groups exercises and combines category filtering with search', async () => {
    const user = userEvent.setup();
    useStateStore.setState({ state: fixture() });
    render(<LibraryPage />);

    expect(screen.getByRole('heading', { name: 'Pecho' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Espalda' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Abrir guía orientativa de Press de banca con barra' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Filtrar por Espalda: 1 ejercicios' }));
    expect(screen.queryByText('Press de banca con barra')).toBeNull();
    expect(screen.getByText('Remo sentado en polea')).toBeTruthy();

    await user.clear(screen.getByPlaceholderText('Buscar ejercicio, músculo o equipo'));
    await user.type(screen.getByPlaceholderText('Buscar ejercicio, músculo o equipo'), 'polea');
    expect(screen.getByText('Remo sentado en polea')).toBeTruthy();
  });

  it('opens an explicitly orientative step-by-step guide for every exercise card', async () => {
    const user = userEvent.setup();
    useStateStore.setState({ state: fixture() });
    render(<LibraryPage />);

    await user.click(screen.getByRole('button', { name: 'Abrir guía orientativa de Press de banca con barra' }));
    const dialog = screen.getByRole('dialog', { name: 'Press de banca con barra' });

    expect(within(dialog).getByRole('img', { name: 'Ilustración orientativa de Press de banca con barra' })).toBeTruthy();
    expect(within(dialog).getByText('Respiración')).toBeTruthy();
    expect(within(dialog).getByText('Evita')).toBeTruthy();
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(3);
    const pause = within(dialog).getByRole('button', { name: 'Pausar' });
    await user.click(pause);
    expect(within(dialog).getByRole('button', { name: 'Reproducir' }).getAttribute('aria-pressed')).toBe('true');
    await user.click(within(dialog).getByRole('button', { name: 'Entendido' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('uses categorized dropdowns for primary and secondary muscles', async () => {
    const user = userEvent.setup();
    useStateStore.setState({ state: fixture() });
    render(<LibraryPage />);

    await user.click(screen.getByRole('button', { name: 'Nuevo ejercicio' }));
    const primaryDropdown = screen.getByText('Seleccionar músculos', { selector: '#primary-muscles-summary' });
    const primaryField = primaryDropdown.closest('fieldset')!;
    await user.click(primaryDropdown);
    await user.click(within(primaryField).getByRole('checkbox', { name: 'Pectoral mayor' }));

    expect(screen.getByRole('button', { name: 'Quitar Pectoral mayor de músculos principales' })).toBeTruthy();
    await user.click(primaryDropdown);

    const secondaryDropdown = screen.getByText('Seleccionar músculos', { selector: '#secondary-muscles-summary' });
    const secondaryField = secondaryDropdown.closest('fieldset')!;
    await user.click(secondaryDropdown);
    expect(within(secondaryField).queryByRole('checkbox', { name: 'Pectoral mayor' })).toBeNull();
    expect(within(secondaryField).getByRole('checkbox', { name: 'Tríceps' })).toBeTruthy();
  });

  it('renders the large catalog progressively instead of mounting every animation', async () => {
    const user = userEvent.setup();
    const value = fixture();
    const template = value.exerciseLibrary[0]!;
    value.exerciseLibrary = Array.from({ length: 30 }, (_, index) => ({
      ...structuredClone(template),
      id: `exercise-${index}`,
      name: `Ejercicio ${String(index + 1).padStart(2, '0')}`,
    }));
    useStateStore.setState({ state: value });
    render(<LibraryPage />);

    expect(screen.getAllByRole('button', { name: /Abrir guía orientativa de/ })).toHaveLength(24);
    await user.click(screen.getByRole('button', { name: 'Mostrar 6 ejercicios más' }));
    expect(screen.getAllByRole('button', { name: /Abrir guía orientativa de/ })).toHaveLength(30);
  });
});

function fixture(): UserState {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    revision: 1,
    owner: { userId: 'user', stateFileKey: 'user', createdAt: now, updatedAt: now },
    preferences: { locale: 'es' },
    bodyWeight: { goal: null, entries: [] },
    bodyMetrics: { profile: { sex: null, ageYears: null, heightCm: null, activityLevel: 'moderate', goal: 'maintain' }, entries: [] },
    exerciseLibrary: [
      { id: 'bench-press', name: 'Press de banca con barra', category: 'chest', equipment: ['barra', 'banco'], measurement: 'repetitions', isBodyweight: false, isPerSide: false, muscles: { primary: ['pectoralis-major'], secondary: ['triceps'] } },
      { id: 'seated-cable-row', name: 'Remo sentado en polea', category: 'back', equipment: ['polea'], measurement: 'repetitions', isBodyweight: false, isPerSide: false, muscles: { primary: ['latissimus-dorsi'], secondary: ['biceps'] } },
    ],
    weeklyPlan: { id: 'plan', name: 'Plan', effectiveFrom: now.slice(0, 10), days: [] },
    scheduleOverrides: [],
    workoutSessions: [],
    progression: { exerciseRules: [] },
    pushSubscriptions: [],
    restTimers: [],
  };
}
