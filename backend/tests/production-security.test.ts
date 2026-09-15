import { createServer, type Server } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApplication, type Application } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';
import type { UserState } from '../src/domain/models.js';

describe('production API regressions', () => {
  let directory: string;
  let application: Application;
  let server: Server;
  let base: string;
  let cookie: string;
  const logicalOrigin = 'http://localhost:8080';
  const password = 'isolated-regression-password-2026';

  async function request(method: string, path: string, body?: unknown, suppliedCookie = cookie) {
    return fetch(`${base}${path}`, { method, headers: { origin: logicalOrigin, 'content-type': 'application/json', ...(suppliedCookie ? { cookie: suppliedCookie } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  }
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'forja-security-'));
    application = createApplication(loadConfig({ NODE_ENV: 'production', RP_ID: 'localhost', EXPECTED_ORIGIN: logicalOrigin, DATA_DIR: directory, SESSION_SECRET: 'isolated-regression-secret-not-for-production' }));
    await application.initialize();
    server = createServer(application.handler);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('No test port');
    base = `http://127.0.0.1:${address.port}`;
    cookie = '';
    const registration = await request('POST', '/api/auth/password/register', { username: 'regression-athlete', password });
    expect(registration.status).toBe(201);
    cookie = registration.headers.getSetCookie().find((value) => value.startsWith('og_session='))!.split(';')[0]!;
  });
  afterEach(async () => {
    await application.close();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await rm(directory, { recursive: true, force: true });
  });

  it('revokes a copied session on logout while another session remains valid', async () => {
    const second = await request('POST', '/api/auth/password/login', { username: 'regression-athlete', password });
    const otherCookie = second.headers.getSetCookie().find((value) => value.startsWith('og_session='))!.split(';')[0]!;
    expect((await request('POST', '/api/auth/logout', {})).status).toBe(204);
    expect((await request('GET', '/api/state')).status).toBe(401);
    expect((await request('GET', '/api/state', undefined, otherCookie)).status).toBe(200);
    const persisted = JSON.parse(await readFile(join(directory, 'db.json'), 'utf8'));
    expect(persisted.sessions).toHaveLength(1);
  });

  it('consumes a ceremony exactly once even when verification fails or arrives concurrently', async () => {
    const options = await request('POST', '/api/auth/login/options', {});
    const flow = options.headers.getSetCookie().find((value) => value.startsWith('og_auth_flow='))!.split(';')[0]!;
    const responses = await Promise.all(Array.from({ length: 8 }, () => request('POST', '/api/auth/login/verify', {}, flow)));
    expect(responses.filter((response) => response.status === 400)).toHaveLength(1);
    expect(responses.filter((response) => response.status === 401)).toHaveLength(7);
    const persisted = JSON.parse(await readFile(join(directory, 'db.json'), 'utf8'));
    expect(persisted.authFlows).toEqual([]);
  });

  it('admits no more than five simultaneous password checks for the same account and client', async () => {
    const responses = await Promise.all(Array.from({ length: 12 }, () => request('POST', '/api/auth/password/login', { username: 'regression-athlete', password: 'incorrect-password' })));
    expect(responses.filter((response) => response.status === 401)).toHaveLength(5);
    expect(responses.filter((response) => response.status === 429)).toHaveLength(7);
  });

  it('treats malformed cookies as unauthenticated and malformed route parameters as bad input', async () => {
    const response = await request('GET', '/api/auth/session', undefined, 'og_session=%ZZ');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ authenticated: false, user: null });
    expect((await request('GET', '/api/workouts/previous/%ZZ')).status).toBe(400);
  });

  it.each([
    ['null workout', (s: UserState) => { s.workoutSessions = [null] as never; }],
    ['negative weight', (s: UserState) => { s.bodyWeight.entries.push({ id: 'invalid', weightKg: -1, measuredAt: new Date().toISOString(), note: null }); }],
    ['duplicate exercise', (s: UserState) => { s.exerciseLibrary.push(structuredClone(s.exerciseLibrary[0]!)); }],
    ['null preferences', (s: UserState) => { s.preferences = null as never; }],
    ['null progression', (s: UserState) => { s.progression = null as never; }],
    ['invalid profile', (s: UserState) => { s.bodyMetrics.profile.sex = 'other' as never; }],
    ['impossible date', (s: UserState) => { s.weeklyPlan.effectiveFrom = '2026-02-30'; }],
    ['invalid image', (s: UserState) => { s.exerciseLibrary[0]!.guideMedia = { kind: 'image', dataUrl: 'data:image/svg+xml;base64,PHN2Zz4=', alt: 'No SVG' }; }],
  ] as const)('rejects %s without changing persisted state', async (_name, mutate) => {
    const initial = await (await request('GET', '/api/state')).json() as UserState;
    const candidate = structuredClone(initial);
    mutate(candidate);
    expect((await request('PUT', '/api/state', candidate)).status).toBe(400);
    expect(await (await request('GET', '/api/state')).json()).toEqual(initial);
    expect((await request('GET', '/api/workouts/previous/barbell-squat')).status).toBe(200);
  });

  it.each([
    { scheduledDate: '2026-02-30', exercises: [] },
    { exercises: [{ exerciseId: 'missing-exercise', sets: [] }] },
    { exercises: [{ exerciseId: 'back-squat', sets: [{ setNumber: 1 }, { setNumber: 1 }] }] },
  ])('rejects independently invalid workout dates, references and duplicate sets', async (body) => {
    expect((await request('POST', '/api/workouts', body)).status).toBe(400);
    expect((await (await request('GET', '/api/state')).json() as UserState).workoutSessions).toEqual([]);
  });

  it('rejects impossible dates through the weight endpoint and accepts a real leap day', async () => {
    expect((await request('POST', '/api/body-weight', { weightKg: 80, measuredAt: '2026-02-30T00:00:00Z' })).status).toBe(400);
    expect((await request('POST', '/api/body-weight', { weightKg: 80, measuredAt: '2024-02-29T00:00:00Z' })).status).toBe(201);
  });

  it('keeps valid local guide images and rejects wrong signatures or excessive size', async () => {
    const initial = await (await request('GET', '/api/state')).json() as UserState;
    const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZ0AAAAASUVORK5CYII=';
    initial.exerciseLibrary[0]!.guideMedia = { kind: 'image', dataUrl: `data:image/png;base64,${png}`, alt: 'Posición inicial y final' };
    const saved = await request('PUT', '/api/state', initial);
    expect(saved.status).toBe(200);
    const valid = await saved.json() as UserState;
    expect(valid.exerciseLibrary[0]!.guideMedia).toEqual(initial.exerciseLibrary[0]!.guideMedia);
    for (const dataUrl of [`data:image/jpeg;base64,${png}`, `data:image/png;base64,${Buffer.alloc(256 * 1024 + 1).toString('base64')}`, 'https://remote.example.com/guide.png']) {
      const candidate = structuredClone(valid);
      candidate.exerciseLibrary[0]!.guideMedia!.dataUrl = dataUrl;
      expect((await request('PUT', '/api/state', candidate)).status).toBe(400);
    }
    expect(await (await request('GET', '/api/state')).json()).toEqual(valid);
  });

  it('rejects guide images over the aggregate limit without changing data', async () => {
    const initial = await (await request('GET', '/api/state')).json() as UserState;
    const data = Buffer.alloc(256 * 1024);
    Buffer.from([137,80,78,71,13,10,26,10]).copy(data);
    data.write('IHDR', 12, 'ascii');
    for (const exercise of initial.exerciseLibrary.slice(0, 17)) exercise.guideMedia = { kind: 'image', dataUrl: `data:image/png;base64,${data.toString('base64')}`, alt: 'Guía de prueba de límite' };
    expect((await request('PUT', '/api/state', initial)).status).toBe(400);
    expect((await (await request('GET', '/api/state')).json() as UserState).exerciseLibrary.every((exercise) => exercise.guideMedia === undefined)).toBe(true);
  });

  it.each(['{broken-json', JSON.stringify({ schemaVersion: 1, revision: 1, owner: null })])('returns 503 for unreadable saved state without overwriting it', async (contents) => {
    const state = await (await request('GET', '/api/state')).json() as UserState;
    const path = join(directory, `state-${state.owner.stateFileKey}.json`);
    await writeFile(path, contents, 'utf8');
    expect((await request('GET', '/api/state')).status).toBe(503);
    expect((await request('PUT', '/api/state', state)).status).toBe(503);
    expect((await request('POST', '/api/body-weight', { weightKg: 80 })).status).toBe(503);
    expect(await readFile(path, 'utf8')).toBe(contents);
  });

  it('returns 503 after account storage corruption without rewriting credentials', async () => {
    const path = join(directory, 'db.json');
    const saved = JSON.parse(await readFile(path, 'utf8'));
    saved.users[0].passkeys = [null];
    const contents = JSON.stringify(saved);
    await writeFile(path, contents, 'utf8');
    expect((await request('GET', '/api/auth/session')).status).toBe(503);
    expect((await request('POST', '/api/auth/password/login', { username: 'regression-athlete', password })).status).toBe(503);
    expect(await readFile(path, 'utf8')).toBe(contents);
  });
});

describe('production origin configuration', () => {
  const env = { NODE_ENV: 'production', RP_ID: 'forja.example.com', EXPECTED_ORIGIN: 'https://forja.example.com', SESSION_SECRET: 'isolated-regression-secret-not-for-production' };
  it('requires explicit origin and RP and turns on Secure cookies', () => {
    expect(loadConfig(env).secureCookies).toBe(true);
    expect(() => loadConfig({ NODE_ENV: 'production', SESSION_SECRET: env.SESSION_SECRET })).toThrow();
    expect(() => loadConfig({ ...env, EXPECTED_ORIGIN: '' })).toThrow();
  });
  it.each(['http://forja.example.com', 'https://forja.example.com/path', 'https://forja.example.com/', 'https://user:pass@forja.example.com', 'https://other.example.com', 'https://forja.example.com?x=1', 'ftp://forja.example.com', 'not-a-url'])('rejects unsafe or incompatible origin %s', (origin) => {
    expect(() => loadConfig({ ...env, EXPECTED_ORIGIN: origin })).toThrow();
  });
  it('permits HTTP loopback only and never mixed secure/insecure origins', () => {
    expect(loadConfig({ ...env, RP_ID: 'localhost', EXPECTED_ORIGIN: 'http://localhost:8080' }).secureCookies).toBe(false);
    expect(() => loadConfig({ ...env, RP_ID: 'localhost', EXPECTED_ORIGIN: 'https://localhost:8080,http://localhost:8080' })).toThrow();
  });
});
