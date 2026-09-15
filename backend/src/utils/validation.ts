import { badRequest } from '../http/errors.js';

export function objectBody(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw badRequest('Request body must be a JSON object');
  }
  return value as Record<string, unknown>;
}

export function stringField(
  object: Record<string, unknown>,
  key: string,
  options: { min?: number; max?: number; optional?: boolean } = {},
): string | undefined {
  const value = object[key];
  if (value === undefined && options.optional) return undefined;
  if (typeof value !== 'string') throw badRequest(`${key} must be a string`);
  const trimmed = value.trim();
  if (trimmed.length < (options.min ?? 1)) throw badRequest(`${key} is too short`);
  if (trimmed.length > (options.max ?? 500)) throw badRequest(`${key} is too long`);
  return trimmed;
}

export function passwordField(
  object: Record<string, unknown>,
  key = 'password',
  options: { min?: number } = {},
): string {
  const value = object[key];
  if (typeof value !== 'string') throw badRequest(`${key} must be a string`);
  if (value.length < (options.min ?? 10)) throw badRequest('La contraseña debe tener al menos 10 caracteres');
  if (value.length > 128 || Buffer.byteLength(value, 'utf8') > 512) {
    throw badRequest('La contraseña es demasiado larga');
  }
  return value;
}

export function numberField(
  object: Record<string, unknown>,
  key: string,
  options: { min?: number; max?: number; integer?: boolean; optional?: boolean } = {},
): number | undefined {
  const value = object[key];
  if (value === undefined && options.optional) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) throw badRequest(`${key} must be a number`);
  if (options.integer && !Number.isInteger(value)) throw badRequest(`${key} must be an integer`);
  if (options.min !== undefined && value < options.min) throw badRequest(`${key} is below the minimum`);
  if (options.max !== undefined && value > options.max) throw badRequest(`${key} exceeds the maximum`);
  return value;
}

export function nullableStringField(
  object: Record<string, unknown>,
  key: string,
  max = 2_000,
): string | null {
  const value = object[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') throw badRequest(`${key} must be a string or null`);
  const trimmed = value.trim();
  if (trimmed.length > max) throw badRequest(`${key} is too long`);
  return trimmed || null;
}

export function isoDateTime(value: string, fieldName: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    throw badRequest(`${fieldName} must be an ISO date-time with a time zone`);
  }
  isoDate(value.slice(0, 10), fieldName);
  const time = value.slice(11, 19).split(':').map(Number);
  if (time[0]! > 23 || time[1]! > 59 || time[2]! > 59) throw badRequest(`${fieldName} contains an invalid time`);
  const date = new Date(value);
  if (Number.isNaN(date.valueOf()) || !value.includes('T')) {
    throw badRequest(`${fieldName} must be an ISO date-time`);
  }
  return date.toISOString();
}

export function isoDate(value: string, fieldName: string): string {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) {
    throw badRequest(`${fieldName} must use YYYY-MM-DD`);
  }
  return value;
}

export function username(value: string): string {
  const normalized = value.trim().toLocaleLowerCase('en-US');
  if (!/^[a-z0-9][a-z0-9._-]{2,63}$/.test(normalized)) {
    throw badRequest('username must be 3-64 characters using letters, numbers, dot, underscore, or hyphen');
  }
  return normalized;
}
