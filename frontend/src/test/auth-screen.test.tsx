import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AuthScreen } from '../features/auth/AuthScreen';

describe('AuthScreen', () => {
  it('offers password registration without requiring a Passkey', async () => {
    const user = userEvent.setup();
    render(<AuthScreen onAuthenticated={vi.fn()} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Entrena. Registra. Evoluciona.' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeTruthy();
    expect(screen.getByLabelText('Contraseña').getAttribute('autocomplete')).toBe('current-password');
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeTruthy();
    expect(screen.getByLabelText('Contraseña').getAttribute('autocomplete')).toBe('new-password');
    expect(screen.getByLabelText('Confirmar contraseña')).toBeTruthy();
    expect(screen.queryByLabelText('Nombre visible')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Passkey' }));
    expect(screen.getByRole('button', { name: 'Crear cuenta y Passkey' })).toBeTruthy();
    expect(screen.getByLabelText('Nombre visible')).toBeTruthy();
    expect(screen.queryByLabelText('Contraseña')).toBeNull();
  });
});
