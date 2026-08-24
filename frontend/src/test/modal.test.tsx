import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from '../components/feedback/ConfirmDialog';

afterEach(() => {
  document.getElementById('root')?.remove();
  document.body.style.overflow = '';
});

describe('primitiva modal compartida', () => {
  it('usa un portal, aísla #root, atrapa Tab y restaura documento y disparador', async () => {
    const user = userEvent.setup();
    const root = document.createElement('div');
    root.id = 'root';
    root.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'clip';
    document.body.append(root);
    render(<ConfirmHarness />, { container: root, baseElement: document.body });

    const trigger = screen.getByRole('button', { name: 'Abrir confirmación' });
    const outside = screen.getByRole('button', { name: 'Acción del fondo' });
    await user.click(trigger);

    const dialog = screen.getByRole('alertdialog', { name: '¿Confirmar cambio?' });
    const cancel = screen.getByRole('button', { name: 'Conservar' });
    const confirm = screen.getByRole('button', { name: 'Aplicar cambio' });
    expect(root.contains(dialog)).toBe(false);
    expect(dialog.parentElement?.parentElement).toBe(document.body);
    expect(root.inert).toBe(true);
    expect(root.hasAttribute('inert')).toBe(true);
    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.activeElement).toBe(cancel);

    outside.focus();
    expect(document.activeElement).toBe(cancel);
    await user.tab();
    expect(document.activeElement).toBe(confirm);
    await user.tab();
    expect(document.activeElement).toBe(cancel);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(confirm);

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(root.inert).toBe(false);
    expect(root.hasAttribute('inert')).toBe(false);
    expect(root.getAttribute('aria-hidden')).toBe('false');
    expect(document.body.style.overflow).toBe('clip');
    expect(document.activeElement).toBe(trigger);
  });

  it('solo cierra el fondo al completarse el click, no en mousedown', () => {
    const root = document.createElement('div');
    root.id = 'root';
    document.body.append(root);
    render(<ConfirmHarness />, { container: root, baseElement: document.body });

    fireEvent.click(screen.getByRole('button', { name: 'Abrir confirmación' }));
    const backdrop = document.querySelector<HTMLElement>('.dialog-backdrop');
    expect(backdrop).not.toBeNull();

    fireEvent.mouseDown(backdrop!);
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    fireEvent.click(backdrop!);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });
});

function ConfirmHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Abrir confirmación</button>
      <button type="button">Acción del fondo</button>
      <ConfirmDialog
        open={open}
        title="¿Confirmar cambio?"
        description="Revisa la decisión antes de continuar."
        confirmLabel="Aplicar cambio"
        onCancel={() => setOpen(false)}
        onConfirm={vi.fn()}
      />
    </>
  );
}
