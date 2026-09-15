import { resolve } from 'node:path';
import { isIP } from 'node:net';

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  dataDir: string;
  rpId: string;
  rpName: string;
  expectedOrigins: string[];
  sessionSecret: string;
  sessionTtlSeconds: number;
  authFlowTtlSeconds: number;
  secureCookies: boolean;
  vapid: {
    subject: string | null;
    publicKey: string | null;
    privateKey: string | null;
  };
}

function requiredProductionValue(
  env: NodeJS.ProcessEnv,
  key: string,
  nodeEnv: AppConfig['nodeEnv'],
  developmentDefault: string,
): string {
  const value = env[key]?.trim();
  if (value) {
    return value;
  }
  if (nodeEnv === 'production') {
    throw new Error(`${key} is required in production`);
  }
  return developmentDefault;
}

function positiveInteger(value: string | undefined, fallback: number, key: string): number {
  if (value === undefined) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${key} must be a positive integer`);
  }
  return parsed;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const rawNodeEnv = env.NODE_ENV ?? 'development';
  if (!['development', 'test', 'production'].includes(rawNodeEnv)) {
    throw new Error('NODE_ENV must be development, test, or production');
  }
  const nodeEnv = rawNodeEnv as AppConfig['nodeEnv'];
  const rpId = requiredProductionValue(env, 'RP_ID', nodeEnv, 'localhost').toLowerCase();
  if (!/^(?:[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?|\[::1\])$/.test(rpId) || rpId.includes('..')) {
    throw new Error('RP_ID must be a hostname without a protocol, port or path');
  }
  const expectedOrigins = requiredProductionValue(env, 'EXPECTED_ORIGIN', nodeEnv, 'http://localhost:8080')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (expectedOrigins.length === 0) {
    throw new Error('EXPECTED_ORIGIN must contain at least one origin');
  }
  const origins = expectedOrigins.map((origin) => {
    let url: URL;
    try { url = new URL(origin); } catch { throw new Error('EXPECTED_ORIGIN contains an invalid URL'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin || url.username || url.password) {
      throw new Error('EXPECTED_ORIGIN must contain exact HTTP(S) origins, without paths, query strings or credentials');
    }
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (nodeEnv === 'production' && url.protocol !== 'https:' && !loopback) {
      throw new Error('Production requires HTTPS except for local loopback testing');
    }
    const rpIsIp = Boolean(isIP(rpId.replace(/^\[|\]$/g, '')));
    if (url.hostname !== rpId && (rpIsIp || !url.hostname.endsWith(`.${rpId}`))) {
      throw new Error('Every EXPECTED_ORIGIN hostname must match RP_ID or be its subdomain');
    }
    return url;
  });
  if (new Set(origins.map((origin) => origin.protocol)).size !== 1) {
    throw new Error('Do not mix HTTP and HTTPS origins in one deployment');
  }

  const sessionSecret = requiredProductionValue(
    env,
    'SESSION_SECRET',
    nodeEnv,
    'development-only-session-secret-change-before-production',
  );
  if (sessionSecret.length < 32) {
    throw new Error('SESSION_SECRET must contain at least 32 characters');
  }

  const vapidSubject = env.VAPID_SUBJECT?.trim() || null;
  const vapidPublicKey = env.VAPID_PUBLIC_KEY?.trim() || null;
  const vapidPrivateKey = env.VAPID_PRIVATE_KEY?.trim() || null;
  const configuredVapidValues = [vapidSubject, vapidPublicKey, vapidPrivateKey].filter(Boolean);
  if (configuredVapidValues.length !== 0 && configuredVapidValues.length !== 3) {
    throw new Error('VAPID_SUBJECT, VAPID_PUBLIC_KEY, and VAPID_PRIVATE_KEY must be set together');
  }

  return {
    nodeEnv,
    port: positiveInteger(env.PORT, 3000, 'PORT'),
    dataDir: resolve(env.DATA_DIR ?? './data'),
    rpId,
    rpName: env.RP_NAME?.trim() || 'FORJA',
    expectedOrigins,
    sessionSecret,
    sessionTtlSeconds: positiveInteger(env.SESSION_TTL_SECONDS, 60 * 60 * 24 * 30, 'SESSION_TTL_SECONDS'),
    authFlowTtlSeconds: positiveInteger(env.AUTH_FLOW_TTL_SECONDS, 5 * 60, 'AUTH_FLOW_TTL_SECONDS'),
    secureCookies: origins.every((origin) => origin.protocol === 'https:'),
    vapid: {
      subject: vapidSubject,
      publicKey: vapidPublicKey,
      privateKey: vapidPrivateKey,
    },
  };
}
