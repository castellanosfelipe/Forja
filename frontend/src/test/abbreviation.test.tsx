import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Abbreviation } from '../components/feedback/Abbreviation';

describe('Abbreviation', () => {
  it('explica la sigla al pasar el cursor y la oculta al salir', async () => {
    const user = userEvent.setup();
    render(<Abbreviation code="RPE" />);

    const trigger = screen.getByRole('button', { name: /RPE: Escala de esfuerzo percibido/i });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    await user.hover(trigger);

    expect(screen.getByRole('tooltip').textContent).toContain('RPE · Escala de esfuerzo percibido');
    expect(screen.getByRole('tooltip').textContent).toContain('dificultad de una serie del 1 al 10');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    await user.unhover(trigger);
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
  });

  it('funciona con teclado y se cierra con Escape', async () => {
    const user = userEvent.setup();
    render(<p>Intensidad: <Abbreviation code="RIR" /></p>);

    await user.tab();
    expect(screen.getByRole('tooltip').textContent).toContain('RIR · Repeticiones en reserva');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /RIR: Repeticiones en reserva/i }));
  });

  it('permite abrir y cerrar la explicación con toque o clic', async () => {
    const user = userEvent.setup();
    render(<Abbreviation code="IMC" />);
    const trigger = screen.getByRole('button', { name: /IMC: Índice de masa corporal/i });

    await user.click(trigger);
    expect(screen.getByRole('tooltip').textContent).toContain('no distingue músculo de grasa corporal');

    await user.click(trigger);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
