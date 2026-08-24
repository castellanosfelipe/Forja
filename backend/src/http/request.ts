import type { IncomingMessage } from 'node:http';
import { HttpError, badRequest } from './errors.js';

const MAX_BODY_BYTES = 10 * 1_048_576;

export async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const contentType = request.headers['content-type']?.split(';')[0]?.trim();
  if (contentType !== 'application/json') {
    throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Content-Type must be application/json');
  }
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.byteLength;
    if (total > MAX_BODY_BYTES) {
      throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Request body exceeds 10 MiB');
    }
    chunks.push(buffer);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    throw badRequest('Request body contains invalid JSON');
  }
}

export function parseIfMatch(header: string | undefined): number | null {
  if (!header) return null;
  const normalized = header.trim().replace(/^W\//, '').replace(/^"|"$/g, '');
  const revision = Number(normalized);
  if (!Number.isSafeInteger(revision) || revision < 1) {
    throw badRequest('If-Match must contain a numeric state revision');
  }
  return revision;
}
