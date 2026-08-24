import type { IncomingMessage } from 'node:http';
import type { Router } from '../router.js';
import { readJsonBody } from '../request.js';
import { json, noContent } from '../response.js';
import type { DatabaseRepository } from '../../repositories/database.repository.js';
import type { UserStateRepository } from '../../repositories/user-state.repository.js';
import type { SessionService } from '../../services/session.service.js';
import type { WebAuthnService } from '../../services/webauthn.service.js';
import type { PasswordAuthService } from '../../services/password-auth.service.js';
import { badRequest, conflict } from '../errors.js';

interface AuthRouteDependencies {
  database: DatabaseRepository;
  states: UserStateRepository;
  sessions: SessionService;
  webauthn: WebAuthnService;
  passwords: PasswordAuthService;
}

export function registerAuthRoutes(router: Router, dependencies: AuthRouteDependencies): void {
  const { database, states, sessions, webauthn, passwords } = dependencies;

  router.add('POST', '/api/auth/password/register', async ({ request, response }) => {
    if (await sessions.optionalUser(request)) throw conflict('Cierra la sesión actual antes de crear otra cuenta');
    const user = await passwords.register(await readJsonBody(request));
    await states.getOrCreate(user);
    sessions.createSession(response, user.id);
    json(response, 201, { user: publicUser(user) });
  });

  router.add('POST', '/api/auth/password/login', async ({ request, response }) => {
    const user = await passwords.login(await readJsonBody(request), clientKey(request));
    sessions.createSession(response, user.id);
    json(response, 200, { user: publicUser(user) });
  });

  router.add('POST', '/api/auth/register/options', async ({ request, response }) => {
    const user = await sessions.optionalUser(request);
    const result = await webauthn.beginRegistration(await readJsonBody(request), user);
    sessions.createAuthFlow(response, result.flow);
    json(response, 200, result.options);
  });

  router.add('POST', '/api/auth/register/verify', async ({ request, response }) => {
    const flow = sessions.consumeAuthFlow(request, response);
    if (flow.kind !== 'registration') throw badRequest('Expected a registration ceremony');
    const currentUser = await sessions.optionalUser(request);
    const user = await webauthn.finishRegistration(await readJsonBody(request), flow, currentUser);
    await states.getOrCreate(user);
    sessions.createSession(response, user.id);
    json(response, 201, { verified: true, user: publicUser(user) });
  });

  router.add('POST', '/api/auth/login/options', async ({ request, response }) => {
    const result = await webauthn.beginAuthentication(await readJsonBody(request));
    sessions.createAuthFlow(response, result.flow);
    json(response, 200, result.options);
  });

  router.add('POST', '/api/auth/login/verify', async ({ request, response }) => {
    const flow = sessions.consumeAuthFlow(request, response);
    if (flow.kind !== 'authentication') throw badRequest('Expected an authentication ceremony');
    const user = await webauthn.finishAuthentication(await readJsonBody(request), flow);
    sessions.createSession(response, user.id);
    json(response, 200, { verified: true, user: publicUser(user) });
  });

  router.add('GET', '/api/auth/session', async ({ request, response }) => {
    const user = await sessions.optionalUser(request);
    json(response, 200, user
      ? { authenticated: true, user: publicUser(user) }
      : { authenticated: false, user: null });
  });

  router.add('POST', '/api/auth/logout', ({ response }) => {
    sessions.clearSession(response);
    noContent(response);
  });

  router.add('GET', '/api/auth/passkeys', async ({ request, response }) => {
    const user = await sessions.requireUser(request);
    json(response, 200, { passkeys: user.passkeys.map(publicPasskey) });
  });

  router.add('DELETE', '/api/auth/passkeys/:credentialId', async ({ request, response, params }) => {
    const user = await sessions.requireUser(request);
    await database.removePasskey(user.id, params.credentialId!);
    noContent(response);
  });
}

function publicUser(user: Awaited<ReturnType<DatabaseRepository['findUserById']>> & object): unknown {
  const typed = user as NonNullable<Awaited<ReturnType<DatabaseRepository['findUserById']>>>;
  return {
    id: typed.id,
    username: typed.username,
    displayName: typed.displayName,
    createdAt: typed.createdAt,
    passkeys: typed.passkeys.map(publicPasskey),
    passwordEnabled: Boolean(typed.passwordCredential),
  };
}

function clientKey(request: IncomingMessage): string {
  const forwarded = request.headers['x-real-ip'];
  return (Array.isArray(forwarded) ? forwarded[0] : forwarded) || request.socket.remoteAddress || 'unknown';
}

function publicPasskey(passkey: NonNullable<Awaited<ReturnType<DatabaseRepository['findUserById']>>>['passkeys'][number]): unknown {
  return {
    id: passkey.id,
    transports: passkey.transports,
    deviceType: passkey.deviceType,
    backedUp: passkey.backedUp,
    createdAt: passkey.createdAt,
    lastUsedAt: passkey.lastUsedAt,
  };
}
