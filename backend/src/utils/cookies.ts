import type { ServerResponse } from 'node:http';

export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
  path?: string;
  maxAge?: number;
}

export function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) {
    return {};
  }
  return Object.fromEntries(
    header.split(';').map((part) => {
      const separator = part.indexOf('=');
      if (separator === -1) {
        return [part.trim(), ''];
      }
      const name = part.slice(0, separator).trim();
      const value = part.slice(separator + 1).trim();
      return [name, decodeURIComponent(value)];
    }),
  );
}

export function serializeCookie(name: string, value: string, options: CookieOptions = {}): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
  parts.push(`Path=${options.path ?? '/'}`);
  if (options.httpOnly ?? true) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  parts.push(`SameSite=${options.sameSite ?? 'Strict'}`);
  return parts.join('; ');
}

export function appendSetCookie(response: ServerResponse, cookie: string): void {
  const current = response.getHeader('Set-Cookie');
  if (Array.isArray(current)) {
    response.setHeader('Set-Cookie', [...current, cookie]);
  } else if (typeof current === 'string') {
    response.setHeader('Set-Cookie', [current, cookie]);
  } else {
    response.setHeader('Set-Cookie', cookie);
  }
}
