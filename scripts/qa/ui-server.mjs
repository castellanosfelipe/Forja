import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApplication } from '../../backend/dist/app.js';
import { loadConfig } from '../../backend/dist/config/env.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const webRoot = resolve(root, 'frontend/dist');
const port = Number(process.env.QA_PORT ?? 5180);
if (!Number.isSafeInteger(port) || port < 1024 || port > 65535) throw new Error('QA_PORT must be a valid unprivileged port');
const qaOrigin = `http://localhost:${port}`;
const config = loadConfig({
  NODE_ENV: 'production', PORT: String(port),
  DATA_DIR: resolve(root, 'work/remediation/ui-data'),
  EXPECTED_ORIGIN: qaOrigin, RP_ID: 'localhost',
  SESSION_SECRET: 'isolated-forja-audit-session-secret-not-for-production-20260909',
});
const app = createApplication(config);
await app.initialize();
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.webmanifest':'application/manifest+json', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp', '.svg':'image/svg+xml', '.woff2':'font/woff2', '.gif':'image/gif' };
const server = http.createServer(async (request, response) => {
  if (request.url?.startsWith('/api/')) return app.handler(request, response);
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', qaOrigin).pathname);
    let file = resolve(webRoot, '.' + pathname);
    if (file !== webRoot && !file.startsWith(webRoot + sep)) { response.writeHead(403).end(); return; }
    const info = await stat(file).catch(() => null);
    if (!info?.isFile()) file = resolve(webRoot, 'index.html');
    const bytes = await readFile(file);
    response.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream', 'Cache-Control':'no-cache' });
    response.end(bytes);
  } catch { response.writeHead(500).end('Audit static server error'); }
});
server.listen(config.port, '127.0.0.1', () => console.info(`FORJA isolated QA ${qaOrigin}; production build, audit data only; not Nginx`));
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => { server.close(); app.close().finally(() => process.exit(0)); });
