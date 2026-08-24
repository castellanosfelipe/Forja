export class HttpError extends Error {
  public constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function badRequest(message: string, details?: unknown): HttpError {
  return new HttpError(400, 'BAD_REQUEST', message, details);
}

export function unauthorized(message = 'Authentication required'): HttpError {
  return new HttpError(401, 'UNAUTHORIZED', message);
}

export function forbidden(message: string): HttpError {
  return new HttpError(403, 'FORBIDDEN', message);
}

export function notFound(message: string): HttpError {
  return new HttpError(404, 'NOT_FOUND', message);
}

export function conflict(message: string): HttpError {
  return new HttpError(409, 'CONFLICT', message);
}

export function tooManyRequests(message: string): HttpError {
  return new HttpError(429, 'TOO_MANY_REQUESTS', message);
}

export function serviceUnavailable(message: string): HttpError {
  return new HttpError(503, 'SERVICE_UNAVAILABLE', message);
}
