import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AppConfig } from '../config/env.js';
import type { AuthFlowClaims, SessionClaims, User } from '../domain/models.js';
import { unauthorized } from '../http/errors.js';
import type { DatabaseRepository } from '../repositories/database.repository.js';
import { appendSetCookie, parseCookies, serializeCookie } from '../utils/cookies.js';
import { SignedTokenService } from './signed-token.service.js';

const SESSION_COOKIE = 'og_session';
const AUTH_FLOW_COOKIE = 'og_auth_flow';

export class SessionService {
  private readonly tokens: SignedTokenService;

  public constructor(
    private readonly config: AppConfig,
    private readonly database: DatabaseRepository,
  ) {
    this.tokens = new SignedTokenService(config.sessionSecret);
  }

  public createSession(response: ServerResponse, userId: string): void {
    const now = Math.floor(Date.now() / 1000);
    const token = this.tokens.issue<SessionClaims>({
      kind: 'session',
      sub: userId,
      iat: now,
      exp: now + this.config.sessionTtlSeconds,
    });
    appendSetCookie(response, serializeCookie(SESSION_COOKIE, token, {
      secure: this.config.secureCookies,
      maxAge: this.config.sessionTtlSeconds,
    }));
  }

  public clearSession(response: ServerResponse): void {
    appendSetCookie(response, serializeCookie(SESSION_COOKIE, '', {
      secure: this.config.secureCookies,
      maxAge: 0,
    }));
  }

  public createAuthFlow(response: ServerResponse, claims: AuthFlowClaims): void {
    const token = this.tokens.issue(claims);
    appendSetCookie(response, serializeCookie(AUTH_FLOW_COOKIE, token, {
      secure: this.config.secureCookies,
      maxAge: this.config.authFlowTtlSeconds,
      path: '/api/auth',
    }));
  }

  public consumeAuthFlow(request: IncomingMessage, response: ServerResponse): AuthFlowClaims {
    const token = parseCookies(request.headers.cookie)[AUTH_FLOW_COOKIE];
    appendSetCookie(response, serializeCookie(AUTH_FLOW_COOKIE, '', {
      secure: this.config.secureCookies,
      maxAge: 0,
      path: '/api/auth',
    }));
    const claims = token ? this.tokens.verify<AuthFlowClaims>(token) : null;
    if (!claims || !['registration', 'authentication'].includes(claims.kind)) {
      throw unauthorized('Authentication ceremony expired or missing');
    }
    return claims;
  }

  public async optionalUser(request: IncomingMessage): Promise<User | null> {
    const token = parseCookies(request.headers.cookie)[SESSION_COOKIE];
    if (!token) return null;
    const claims = this.tokens.verify<SessionClaims>(token);
    if (!claims || claims.kind !== 'session') return null;
    return this.database.findUserById(claims.sub);
  }

  public async requireUser(request: IncomingMessage): Promise<User> {
    const user = await this.optionalUser(request);
    if (!user) throw unauthorized();
    return user;
  }
}
