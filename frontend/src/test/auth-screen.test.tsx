import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authApi } from '../api/auth.api';
import { AuthScreen } from '../features/auth/AuthScreen';

afterEach(() => vi.restoreAllMocks());

describe('AuthScreen', () => {
  it('offers password registration without requiring device-based access', async () => {
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

    await user.click(screen.getByRole('button', { name: 'Huella, rostro o llave' }));
    expect(screen.getByRole('button', { name: 'Crear cuenta y activar acceso rápido' })).toBeTruthy();
    expect(screen.getByLabelText('Nombre visible')).toBeTruthy();
    expect(screen.queryByLabelText('Contraseña')).toBeNull();
  });

  it('replaces internal access errors with useful guidance', async () => {
    const user = userEvent.setup();
    vi.spyOn(authApi, 'loginPasskey').mockRejectedValueOnce(
      new Error('Invalid WebAuthn credential response'),
    );
    const view = render(<AuthScreen onAuthenticated={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Huella, rostro o llave' }));
    await user.click(screen.getByRole('button', { name: 'Entrar con huella, rostro o llave' }));

    expect((await screen.findByRole('alert')).textContent).toContain(
      'No pudimos confirmar tu identidad con este dispositivo.',
    );
    expect(view.container.textContent).not.toMatch(
      /webauthn|passkey|web push|wake lock|pwa|json|servidor|\bapi\b|http/i,
    );
  });
});
