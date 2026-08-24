import { describe, expect, it, vi } from 'vitest';
import { SignedTokenService } from '../src/services/signed-token.service.js';

describe('SignedTokenService', () => {
  it('round-trips valid claims and rejects tampering', () => {
    const service = new SignedTokenService('a-secure-test-secret-with-more-than-32-characters');
    const token = service.issue({ sub: 'user-1', exp: Math.floor(Date.now() / 1000) + 60 });

    expect(service.verify<{ sub: string; exp: number }>(token)?.sub).toBe('user-1');
    expect(service.verify(`${token.slice(0, -1)}x`)).toBeNull();
  });

  it('rejects expired claims', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-24T12:00:00.000Z'));
    const service = new SignedTokenService('a-secure-test-secret-with-more-than-32-characters');
    const token = service.issue({ sub: 'user-1', exp: Math.floor(Date.now() / 1000) - 1 });

    expect(service.verify(token)).toBeNull();
    vi.useRealTimers();
  });
});
