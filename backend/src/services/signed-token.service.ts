import { createHmac, timingSafeEqual } from 'node:crypto';

export class SignedTokenService {
  public constructor(private readonly secret: string) {}

  public issue<T extends object>(claims: T): string {
    const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
    return `${payload}.${this.signature(payload)}`;
  }

  public verify<T extends { exp: number }>(token: string): T | null {
    const separator = token.lastIndexOf('.');
    if (separator <= 0) {
      return null;
    }
    const payload = token.slice(0, separator);
    const receivedSignature = token.slice(separator + 1);
    const expectedSignature = this.signature(payload);
    const received = Buffer.from(receivedSignature);
    const expected = Buffer.from(expectedSignature);
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
      return null;
    }
    try {
      const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as T;
      if (!Number.isFinite(claims.exp) || claims.exp <= Math.floor(Date.now() / 1000)) {
        return null;
      }
      return claims;
    } catch {
      return null;
    }
  }

  private signature(payload: string): string {
    return createHmac('sha256', this.secret).update(payload).digest('base64url');
  }
}
