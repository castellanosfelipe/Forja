import { createServer, type Server } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApplication, type Application } from '../src/app.js';
import type { AppConfig } from '../src/config/env.js';

describe('HTTP API', () => {
  let directory: string;
  let application: Application;
  let server: Server;
  let origin: string;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'forja-api-'));
    const config: AppConfig = {
      nodeEnv: 'test',
      port: 0,
      dataDir: directory,
      rpId: 'localhost',
      rpName: 'FORJA Test',
      expectedOrigins: ['http://localhost:8080'],
      sessionSecret: 'test-session-secret-that-is-definitely-long-enough',
      sessionTtlSeconds: 3_600,
      authFlowTtlSeconds: 300,
      secureCookies: false,
      vapid: { subject: null, publicKey: null, privateKey: null },
    };
    application = createApplication(config);
    await application.initialize();
    server = createServer(application.handler);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Server did not expose a TCP address');
    origin = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await application.close();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await rm(directory, { recursive: true, force: true });
  });

  it('reports health without authentication', async () => {
    const response = await fetch(`${origin}/api/health`);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: 'ok' });
  });

  it('creates registration options and a signed ceremony cookie', async () => {
    const response = await fetch(`${origin}/api/auth/register/options`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost:8080',
      },
      body: JSON.stringify({ username: 'athlete', displayName: 'Athlete' }),
    });
    const options = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(options.challenge).toEqual(expect.any(String));
    expect(options.rp).toMatchObject({ id: 'localhost', name: 'FORJA Test' });
    expect(response.headers.getSetCookie().join(';')).toContain('og_auth_flow=');
  });

  it('rejects unsupported content types', async () => {
    const response = await fetch(`${origin}/api/auth/login/options`, {
      method: 'POST',
      headers: { 'content-type': 'text/plain', origin: 'http://localhost:8080' },
      body: '{}',
    });
    expect(response.status).toBe(415);
  });

  it('registers and authenticates an account using only username and password', async () => {
    const password = 'frase-segura-forja-2026';
    const registration = await fetch(`${origin}/api/auth/password/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost:8080' },
      body: JSON.stringify({ username: 'password-athlete', password }),
    });
    const registrationBody = await registration.json() as { user: Record<string, unknown> };

    expect(registration.status).toBe(201);
    expect(registrationBody.user).toMatchObject({
      username: 'password-athlete',
      displayName: 'password-athlete',
      passwordEnabled: true,
      passkeys: [],
    });
    expect(registration.headers.getSetCookie().join(';')).toContain('og_session=');
    const sessionCookie = registration.headers.getSetCookie().find((cookie) => cookie.startsWith('og_session='))!.split(';')[0]!;

    const reminderSync = await fetch(`${origin}/api/push/body-measurement-reminder/sync`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost:8080', cookie: sessionCookie },
      body: '{}',
    });
    expect(reminderSync.status).toBe(200);
    await expect(reminderSync.json()).resolves.toMatchObject({ enabled: true, intervalMonths: 1 });

    const persisted = await readFile(join(directory, 'db.json'), 'utf8');
    expect(persisted).not.toContain(password);
    expect(JSON.parse(persisted).users[0].passwordCredential).toMatchObject({
      algorithm: 'scrypt',
      keyLength: 64,
      cost: 16_384,
    });

    const rejected = await fetch(`${origin}/api/auth/password/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost:8080' },
      body: JSON.stringify({ username: 'password-athlete', password: 'incorrecta' }),
    });
    expect(rejected.status).toBe(401);

    const login = await fetch(`${origin}/api/auth/password/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost:8080' },
      body: JSON.stringify({ username: 'PASSWORD-ATHLETE', password }),
    });
    expect(login.status).toBe(200);
    await expect(login.json()).resolves.toMatchObject({ user: { username: 'password-athlete', passwordEnabled: true } });
    expect(login.headers.getSetCookie().join(';')).toContain('og_session=');
  });
});
