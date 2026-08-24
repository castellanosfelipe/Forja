import type { ServerResponse } from 'node:http';
import { HttpError } from '../errors.js';
import { json } from '../response.js';

export function handleError(error: unknown, response: ServerResponse, requestId: string): void {
  if (response.headersSent) {
    response.destroy();
    return;
  }
  if (error instanceof HttpError) {
    json(response, error.statusCode, {
      error: {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
        requestId,
      },
    });
    return;
  }
  console.error(JSON.stringify({ level: 'error', requestId, error: serializeError(error) }));
  json(response, 500, {
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected server error occurred',
      requestId,
    },
  });
}

function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { value: String(error) };
}
