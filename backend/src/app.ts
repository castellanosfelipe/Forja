import { randomUUID } from 'node:crypto';
import type { IncomingMessage, RequestListener, ServerResponse } from 'node:http';
import { join } from 'node:path';
import type { AppConfig } from './config/env.js';
import { forbidden } from './http/errors.js';
import { handleError } from './http/middleware/error-handler.js';
import { json } from './http/response.js';
import { Router } from './http/router.js';
import { registerAuthRoutes } from './http/routes/auth.routes.js';
import { registerPushRoutes } from './http/routes/push.routes.js';
import { registerStateRoutes } from './http/routes/state.routes.js';
import { registerWorkoutRoutes } from './http/routes/workout.routes.js';
import { DatabaseRepository } from './repositories/database.repository.js';
import { UserStateRepository } from './repositories/user-state.repository.js';
import { ProgressionService } from './services/progression.service.js';
import { PasswordAuthService } from './services/password-auth.service.js';
import { PushService } from './services/push.service.js';
import { SessionService } from './services/session.service.js';
import { WebAuthnService } from './services/webauthn.service.js';

export interface Application {
  handler: RequestListener;
  initialize(): Promise<void>;
  close(): Promise<void>;
}

export function createApplication(config: AppConfig): Application {
  const database = new DatabaseRepository(join(config.dataDir, 'db.json'));
  const states = new UserStateRepository(config.dataDir);
  const sessions = new SessionService(config, database);
  const webauthn = new WebAuthnService(config, database);
  const passwords = new PasswordAuthService(database);
  const progression = new ProgressionService();
  const push = new PushService(config, states);
  const router = new Router();

  router.add('GET', '/api/health', ({ response }) => {
    json(response, 200, {
      status: 'ok',
      service: 'forja-web-backend',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });
  registerAuthRoutes(router, { database, states, sessions, webauthn, passwords });
  registerStateRoutes(router, sessions, states);
  registerWorkoutRoutes(router, sessions, states, progression);
  registerPushRoutes(router, sessions, push);

  const handler: RequestListener = (request, response) => {
    void handleRequest(config, router, request, response);
  };

  return {
    handler,
    async initialize() {
      await database.initialize();
      const snapshot = await database.snapshot();
      await push.restore(snapshot.users);
    },
    async close() {
      push.shutdown();
    },
  };
}

async function handleRequest(
  config: AppConfig,
  router: Router,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const requestId = randomUUID();
  const startedAt = performance.now();
  response.setHeader('X-Request-Id', requestId);
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('Permissions-Policy', 'publickey-credentials-create=(self), publickey-credentials-get=(self)');

  try {
    enforceSameOrigin(config, request);
    await router.dispatch(request, response);
  } catch (error) {
    handleError(error, response, requestId);
  } finally {
    console.info(JSON.stringify({
      level: 'info',
      requestId,
      method: request.method,
      path: request.url?.split('?')[0],
      statusCode: response.statusCode,
      durationMs: Math.round((performance.now() - startedAt) * 10) / 10,
    }));
  }
}

function enforceSameOrigin(config: AppConfig, request: IncomingMessage): void {
  const method = request.method?.toUpperCase() ?? 'GET';
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return;
  const origin = request.headers.origin;
  if (origin && !config.expectedOrigins.includes(origin)) {
    throw forbidden('Cross-origin requests are not allowed');
  }
  if (!origin && config.nodeEnv === 'production') {
    throw forbidden('Origin header is required');
  }
}
