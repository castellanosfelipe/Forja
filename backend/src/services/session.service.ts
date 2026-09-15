import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
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

  public async createSession(response: ServerResponse, userId: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const sid = randomUUID();
    await this.database.createSession(sid, userId, now + this.config.sessionTtlSeconds);
    const token = this.tokens.issue<SessionClaims>({
      kind: 'session',
      sub: userId,
      sid,
      iat: now,
      exp: now + this.config.sessionTtlSeconds,
    });
    appendSetCookie(response, serializeCookie(SESSION_COOKIE, token, {
      secure: this.config.secureCookies,
      maxAge: this.config.sessionTtlSeconds,
    }));
  }

  public async clearSession(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const token = parseCookies(request.headers.cookie)[SESSION_COOKIE];
    const claims = token ? this.tokens.verify<SessionClaims>(token) : null;
    if (claims?.kind === 'session' && typeof claims.sid === 'string') await this.database.revokeSession(claims.sid);
    appendSetCookie(response, serializeCookie(SESSION_COOKIE, '', {
      secure: this.config.secureCookies,
      maxAge: 0,
    }));
  }

  public async createAuthFlow(response: ServerResponse, claims: AuthFlowClaims): Promise<void> {
    const jti = randomUUID();
    await this.database.createAuthFlow(jti, claims.exp);
    const token = this.tokens.issue({ ...claims, jti });
    appendSetCookie(response, serializeCookie(AUTH_FLOW_COOKIE, token, {
      secure: this.config.secureCookies,
      maxAge: this.config.authFlowTtlSeconds,
      path: '/api/auth',
    }));
  }

  public async consumeAuthFlow(request: IncomingMessage, response: ServerResponse): Promise<AuthFlowClaims> {
    const token = parseCookies(request.headers.cookie)[AUTH_FLOW_COOKIE];
    appendSetCookie(response, serializeCookie(AUTH_FLOW_COOKIE, '', {
      secure: this.config.secureCookies,
      maxAge: 0,
      path: '/api/auth',
    }));
    const claims = token ? this.tokens.verify<AuthFlowClaims & { jti: string }>(token) : null;
    if (!claims || !['registration', 'authentication'].includes(claims.kind) || typeof claims.jti !== 'string' || !await this.database.consumeAuthFlow(claims.jti)) {
      throw unauthorized('Authentication ceremony expired or missing');
    }
    return claims;
  }

  public async optionalUser(request: IncomingMessage): Promise<User | null> {
    const token = parseCookies(request.headers.cookie)[SESSION_COOKIE];
    if (!token) return null;
    const claims = this.tokens.verify<SessionClaims>(token);
    if (!claims || claims.kind !== 'session' || typeof claims.sid !== 'string' || !await this.database.hasSession(claims.sid, claims.sub)) return null;
    return this.database.findUserById(claims.sub);
  }

  public async requireUser(request: IncomingMessage): Promise<User> {
    const user = await this.optionalUser(request);
    if (!user) throw unauthorized();
    return user;
  }
}
