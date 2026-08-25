import { describe, expect, it } from 'vitest';
import { canonicalAppUrl } from '../utils/canonical-origin';

describe('canonicalAppUrl', () => {
  it('preserves the complete route while replacing the IPv4 loopback alias', () => {
    expect(canonicalAppUrl('http://127.0.0.1:8090/workout?day=3#series')).toBe(
      'http://localhost:8090/workout?day=3#series',
    );
  });

  it('replaces the IPv6 loopback alias', () => {
    expect(canonicalAppUrl('http://[::1]:8090/profile')).toBe(
      'http://localhost:8090/profile',
    );
  });

  it.each([
    'http://localhost:8090/',
    'https://forja.example.com/',
  ])('does not redirect an already valid address: %s', (url) => {
    expect(canonicalAppUrl(url)).toBeNull();
  });
});
