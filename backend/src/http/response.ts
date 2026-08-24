import type { ServerResponse } from 'node:http';

export function json(response: ServerResponse, statusCode: number, body: unknown): void {
  const payload = JSON.stringify(body);
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Content-Length', Buffer.byteLength(payload));
  response.setHeader('Cache-Control', 'no-store');
  response.end(payload);
}

export function noContent(response: ServerResponse): void {
  response.statusCode = 204;
  response.end();
}

export function stateJson(response: ServerResponse, body: { revision: number }): void {
  response.setHeader('ETag', `"${body.revision}"`);
  json(response, 200, body);
}
