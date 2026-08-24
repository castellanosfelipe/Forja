import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from '../components/feedback/ConfirmDialog';
import { RestTimer } from '../components/workout/RestTimer';

describe('accessible interaction patterns', () => {
  it('protects destructive actions with a labelled modal and safe initial focus', () => {
    render(
      <ConfirmDialog
        open
        title="¿Eliminar esta medición?"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar medición"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByRole('alertdialog', { name: '¿Eliminar esta medición?' })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Conservar' }));
  });

  it('gives every compact timer action an accessible name', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    const view = render(<RestTimer seconds={75} onAdd={onAdd} onSkip={vi.fn()} />);

    expect(screen.getByRole('timer', { name: '1 minuto y 15 segundos' })).toBeTruthy();
    expect((view.container.querySelector('.timer-ring') as HTMLElement).style.getPropertyValue('--timer-progress')).toBe('360deg');
    view.rerender(<RestTimer seconds={60} onAdd={onAdd} onSkip={vi.fn()} />);
    expect((view.container.querySelector('.timer-ring') as HTMLElement).style.getPropertyValue('--timer-progress')).toBe('288deg');
    await user.click(screen.getByRole('button', { name: 'Añadir 15 segundos' }));
    expect(onAdd).toHaveBeenCalledWith(15);
    view.rerender(<RestTimer seconds={75} onAdd={onAdd} onSkip={vi.fn()} />);
    expect(Number.parseFloat((view.container.querySelector('.timer-ring') as HTMLElement).style.getPropertyValue('--timer-progress'))).toBeCloseTo(300);
  });
});
