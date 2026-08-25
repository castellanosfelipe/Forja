import { describe, expect, it } from 'vitest';
import { userFacingError } from '../utils/user-facing-error';

describe('userFacingError', () => {
  const fallback = 'No pudimos completar la acción.';

  it('preserves a clear validation message', () => {
    expect(userFacingError(new Error('Las contraseñas no coinciden.'), fallback)).toBe(
      'Las contraseñas no coinciden.',
    );
  });

  it.each([
    'Invalid WebAuthn credential response',
    'State revision mismatch; current revision is 4',
    'HTTP request failed with status 500',
    'Malformed JSON payload',
    'NotAllowedError: The operation either timed out or was not allowed',
    'The network connection was lost',
    'Almacenamiento no disponible',
    'No se pudo validar la firma criptográfica',
    'La clave pública no coincide',
  ])('hides internal detail: %s', (detail) => {
    expect(userFacingError(new Error(detail), fallback)).toBe(fallback);
  });

  it('uses the fallback for unknown failures', () => {
    expect(userFacingError({ reason: 'unknown' }, fallback)).toBe(fallback);
  });
});
