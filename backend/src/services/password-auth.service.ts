import { randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import type { StoredPasswordCredential, User } from '../domain/models.js';
import { conflict, tooManyRequests, unauthorized } from '../http/errors.js';
import type { AccountRepository } from '../repositories/contracts.js';
import { objectBody, passwordField, stringField, username as normalizeUsername } from '../utils/validation.js';

const KEY_LENGTH = 64;
const SCRYPT_COST = 16_384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const SCRYPT_MAX_MEMORY = 64 * 1024 * 1024;
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

export class PasswordAuthService {
  public constructor(private readonly database: AccountRepository) {}

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
    if (!await this.database.reservePasswordAttempt(attemptKey)) {
      throw tooManyRequests('Demasiados intentos. Espera 15 minutos antes de volver a probar');
    }
    const user = await this.database.findUserByUsername(username);
    const credential = user?.passwordCredential ?? DUMMY_CREDENTIAL;
    const verified = await verifyPassword(password, credential);
    if (!user || !user.passwordCredential || !verified) {
      throw unauthorized('Usuario o contraseña incorrectos');
    }

    await this.database.clearPasswordAttempts(attemptKey);
    return user;
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
