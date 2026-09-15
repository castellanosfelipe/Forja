import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApplication, type Application } from '../backend/src/app.js';
import { loadConfig } from '../backend/src/config/env.js';

let applicationPromise: Promise<Application> | null = null;

function application(): Promise<Application> {
  applicationPromise ??= (async () => {
    const instance = createApplication(loadConfig());
    await instance.initialize();
    return instance;
  })();
  return applicationPromise;
}

export default async function handler(request: IncomingMessage, response: ServerResponse): Promise<void> {
  try {
    const instance = await application();
    await instance.handle(request, response);
  } catch (error) {
    applicationPromise = null;
    console.error(JSON.stringify({
      level: 'error',
      event: 'vercel_function_initialization_failed',
      message: error instanceof Error ? error.message : 'unknown error',
    }));
    if (!response.headersSent) {
      response.statusCode = 503;
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.setHeader('Cache-Control', 'no-store');
    }
    if (!response.writableEnded) {
      response.end(JSON.stringify({
        error: { code: 'SERVICE_UNAVAILABLE', message: 'FORJA no pudo iniciar. Inténtalo nuevamente.' },
      }));
    }
  }
}
