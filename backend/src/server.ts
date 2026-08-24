import { createServer } from 'node:http';
import { createApplication } from './app.js';
import { loadConfig } from './config/env.js';

const config = loadConfig();
const application = createApplication(config);
await application.initialize();

const server = createServer(application.handler);
server.requestTimeout = 15_000;
server.headersTimeout = 20_000;
server.keepAliveTimeout = 5_000;
server.maxRequestsPerSocket = 1_000;

server.listen(config.port, '0.0.0.0', () => {
  console.info(JSON.stringify({
    level: 'info',
    message: 'FORJA backend listening',
    port: config.port,
    rpId: config.rpId,
    expectedOrigins: config.expectedOrigins,
  }));
});

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(JSON.stringify({ level: 'info', message: 'Graceful shutdown started', signal }));
  server.closeIdleConnections();
  const forceTimer = setTimeout(() => server.closeAllConnections(), 10_000);
  forceTimer.unref();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await application.close();
  clearTimeout(forceTimer);
}

process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));
