export interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
    requestId?: string;
  };
}

export class ApiError extends Error {
  public constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function api<T>(
  path: string,
  options: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { json: jsonBody, ...requestOptions } = options;
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  let body = options.body;
  if (jsonBody !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(jsonBody);
  }
  const request: RequestInit = {
    ...requestOptions,
    headers,
    credentials: 'same-origin',
  };
  if (body !== undefined) request.body = body;
  const response = await fetch(path, request);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as ApiErrorBody;
    throw new ApiError(
      response.status,
      payload.error?.code ?? 'REQUEST_FAILED',
      payload.error?.message ?? 'No pudimos completar la acción. Inténtalo de nuevo.',
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
