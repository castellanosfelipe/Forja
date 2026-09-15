import { randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import type { StoredPasswordCredential, User } from '../domain/models.js';
import { conflict, tooManyRequests, unauthorized } from '../http/errors.js';
import type { DatabaseRepository } from '../repositories/database.repository.js';
import { objectBody, passwordField, stringField, username as normalizeUsername } from '../utils/validation.js';

const KEY_LENGTH = 64;
const SCRYPT_COST = 16_384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const SCRYPT_MAX_MEMORY = 64 * 1024 * 1024;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1_000;
const MAX_FAILURES = 5;
const BLOCK_MS = 15 * 60 * 1_000;
const DUMMY_CREDENTIAL: StoredPasswordCredential = {
  algorithm: 'scrypt',
  salt: Buffer.from('FORJA-password-verification-dummy-salt').toString('base64url'),
  hash: Buffer.alloc(KEY_LENGTH).toString('base64url'),
  keyLength: KEY_LENGTH,
  cost: SCRYPT_COST,
  blockSize: SCRYPT_BLOCK_SIZE,
  parallelization: SCRYPT_PARALLELIZATION,
  createdAt: '1970-01-01T00:00:00.000Z',
};

interface LoginAttempt {
  failures: number;
  windowStartedAt: number;
  blockedUntil: number;
  inFlight: number;
}

export class PasswordAuthService {
  private readonly attempts = new Map<string, LoginAttempt>();

  public constructor(private readonly database: DatabaseRepository) {}

  public async register(input: unknown): Promise<User> {
    const body = objectBody(input);
    const username = normalizeUsername(stringField(body, 'username', { min: 3, max: 64 })!);
    const password = passwordField(body);
    const existing = await this.database.findUserByUsername(username);
    if (existing) throw conflict('Ese nombre de usuario ya está registrado');

    const now = new Date().toISOString();
    return this.database.createUser({
      id: randomUUID(),
      webauthnUserId: randomBytes(32).toString('base64url'),
      username,
      displayName: username,
      stateFileKey: randomUUID(),
      createdAt: now,
      updatedAt: now,
      passkeys: [],
      passwordCredential: await hashPassword(password, now),
    });
  }

  public async login(input: unknown, clientKey: string): Promise<User> {
    const body = objectBody(input);
    const username = normalizeUsername(stringField(body, 'username', { min: 3, max: 64 })!);
    const password = passwordField(body, 'password', { min: 1 });
    const attemptKey = `${clientKey}:${username.toLocaleLowerCase('en-US')}`;
    this.reserveAttempt(attemptKey);
    let success = false;
    try {
    const user = await this.database.findUserByUsername(username);
    const credential = user?.passwordCredential ?? DUMMY_CREDENTIAL;
    const verified = await verifyPassword(password, credential);
    if (!user || !user.passwordCredential || !verified) {
      throw unauthorized('Usuario o contraseña incorrectos');
    }

    success = true;
    return user;
    } finally {
      const attempt = this.attempts.get(attemptKey)!;
      attempt.inFlight -= 1;
      if (success) { attempt.failures = 0; attempt.blockedUntil = 0; }
      else this.recordFailure(attemptKey);
      if (success && attempt.inFlight === 0) this.attempts.delete(attemptKey);
    }
  }

  private reserveAttempt(key: string): void {
    const now = Date.now();
    for (const [candidate, entry] of this.attempts) {
      if (!entry.inFlight && entry.blockedUntil <= now && now - entry.windowStartedAt >= ATTEMPT_WINDOW_MS) this.attempts.delete(candidate);
    }
    let attempt = this.attempts.get(key);
    if (!attempt) {
      if (this.attempts.size >= 10_000) throw tooManyRequests('Demasiados intentos. Vuelve a intentarlo más tarde');
      attempt = { failures: 0, windowStartedAt: now, blockedUntil: 0, inFlight: 0 };
      this.attempts.set(key, attempt);
    }
    if (attempt.blockedUntil > now || attempt.failures + attempt.inFlight >= MAX_FAILURES) {
      throw tooManyRequests('Demasiados intentos. Espera 15 minutos antes de volver a probar');
    }
    attempt.inFlight += 1;
  }

  private recordFailure(key: string): void {
    const now = Date.now();
    const current = this.attempts.get(key);
    const attempt = !current || now - current.windowStartedAt >= ATTEMPT_WINDOW_MS
      ? { failures: 0, windowStartedAt: now, blockedUntil: 0, inFlight: current?.inFlight ?? 0 }
      : current;
    attempt.failures += 1;
    if (attempt.failures >= MAX_FAILURES) attempt.blockedUntil = now + BLOCK_MS;
    this.attempts.set(key, attempt);
  }
}

async function hashPassword(password: string, createdAt: string): Promise<StoredPasswordCredential> {
  const salt = randomBytes(32);
  const hash = await deriveKey(password, salt);
  return {
    algorithm: 'scrypt',
    salt: salt.toString('base64url'),
    hash: hash.toString('base64url'),
    keyLength: KEY_LENGTH,
    cost: SCRYPT_COST,
    blockSize: SCRYPT_BLOCK_SIZE,
    parallelization: SCRYPT_PARALLELIZATION,
    createdAt,
  };
}

async function verifyPassword(password: string, credential: StoredPasswordCredential): Promise<boolean> {
  if (
    credential.algorithm !== 'scrypt' ||
    credential.keyLength !== KEY_LENGTH ||
    credential.cost !== SCRYPT_COST ||
    credential.blockSize !== SCRYPT_BLOCK_SIZE ||
    credential.parallelization !== SCRYPT_PARALLELIZATION
  ) return false;
  try {
    const expected = Buffer.from(credential.hash, 'base64url');
    if (expected.length !== KEY_LENGTH) return false;
    const actual = await deriveKey(password, Buffer.from(credential.salt, 'base64url'));
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, {
      N: SCRYPT_COST,
      r: SCRYPT_BLOCK_SIZE,
      p: SCRYPT_PARALLELIZATION,
      maxmem: SCRYPT_MAX_MEMORY,
    }, (error, derivedKey) => error ? reject(error) : resolve(derivedKey));
  });
}
