import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { chmod, mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const webPush = createRequire(new URL('../../backend/package.json', import.meta.url))('web-push');
const project = `forja-smoke-${randomBytes(5).toString('hex')}`;
const workspace = await mkdtemp(join(tmpdir(), `${project}-`));
const data = join(workspace, 'data');
await mkdir(data, { mode: 0o777 });
await chmod(data, 0o777); // Disposable test accounts only; the container runs as UID 1000.
const envFile = join(workspace, 'empty.env');
await writeFile(envFile, '# No production environment is loaded by this test.\n');
const probe = createServer();
await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve); });
const port = probe.address().port;
await new Promise((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
const origin = `http://localhost:${port}`;
const vapid = webPush.generateVAPIDKeys();
const env = { ...process.env, APP_BIND_ADDRESS: '127.0.0.1', APP_PORT: String(port), FORJA_DATA_DIR: data.replaceAll('\\', '/'), EXPECTED_ORIGIN: origin, RP_ID: 'localhost', RP_NAME: 'FORJA QA', SESSION_SECRET: randomBytes(48).toString('base64url'), SESSION_TTL_SECONDS: '600', AUTH_FLOW_TTL_SECONDS: '90', VAPID_SUBJECT: 'mailto:qa@example.invalid', VAPID_PUBLIC_KEY: vapid.publicKey, VAPID_PRIVATE_KEY: vapid.privateKey };
const args = ['compose', '--project-name', project, '--env-file', envFile, '-f', join(root, 'docker-compose.yml')];
async function docker(commands, timeout = 12 * 60_000) {
  await new Promise((resolve, reject) => {
    const child = spawn('docker', [...args, ...commands], { cwd: root, env, stdio: 'inherit', windowsHide: true });
    const timer = setTimeout(() => { child.kill(); reject(new Error('Docker excedió el tiempo disponible.')); }, timeout);
    child.once('error', (error) => { clearTimeout(timer); reject(error); });
    child.once('close', (code) => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error(`Docker terminó con código ${code}.`)); });
  });
}
async function request(path, options = {}) {
  return fetch(`${origin}${path}`, { redirect: 'manual', ...options, headers: { Origin: origin, ...options.headers }, signal: AbortSignal.timeout(15_000) });
}
const result = { project, startedAt: new Date().toISOString(), status: 'FAIL', checks: [] };
let started = false;
try {
  await docker(['config', '--quiet'], 30_000);
  await docker(['build', '--pull']);
  started = true;
  await docker(['up', '-d', '--wait', '--wait-timeout', '120'], 150_000);
  const health = await request('/api/health'); assert.equal(health.status, 200); result.checks.push('health through Nginx');
  const index = await request('/'); assert.equal(index.status, 200); assert.match(index.headers.get('content-security-policy') ?? '', /default-src 'self'/); result.checks.push('frontend + security headers');
  const worker = await request('/service-worker.js'); assert.equal(worker.status, 200); assert.match(await worker.text(), /self.__FORJA_PRECACHE =/); result.checks.push('build precache + worker');
  const registration = await request('/api/auth/password/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'smoke_qa', password: randomBytes(24).toString('base64url') }) });
  assert.equal(registration.status, 201);
  const cookie = registration.headers.getSetCookie().find((value) => value.startsWith('og_session='))?.split(';')[0];
  assert.ok(cookie); result.checks.push('password account through same origin');
  const state = await request('/api/state', { headers: { Cookie: cookie } }); assert.equal(state.status, 200);
  const snapshot = await state.json(); assert.ok(snapshot.exerciseLibrary.length >= 195); result.checks.push('persistent catalog');
  await docker(['restart', 'backend'], 60_000);
  await docker(['up', '-d', '--wait', '--wait-timeout', '90'], 120_000);
  assert.equal((await request('/api/state', { headers: { Cookie: cookie } })).status, 200); result.checks.push('session and state survive restart');
  assert.equal((await request('/api/auth/logout', { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: '{}' })).status, 204);
  assert.equal((await request('/api/state', { headers: { Cookie: cookie } })).status, 401); result.checks.push('logout revocation');
  result.status = 'PASS';
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally {
  if (started) await docker(['down', '--remove-orphans'], 60_000).catch((error) => { console.error(error.message); process.exitCode = 1; });
  await writeFile(join(workspace, 'result.json'), JSON.stringify(result, null, 2));
  console.info(`Prueba ${result.status}: ${result.checks.length} comprobaciones. Evidencia y datos ficticios: ${workspace}`);
}
