import type { Database, StoredPasskey, User, UserState } from '../domain/models.js';

export interface AccountRepository {
  initialize(): Promise<void>;
  snapshot(): Promise<Database>;
  findUserById(userId: string): Promise<User | null>;
  findUserByUsername(username: string): Promise<User | null>;
  findUserByCredentialId(credentialId: string): Promise<User | null>;
  createSession(id: string, userId: string, expiresAt: number): Promise<void>;
  hasSession(id: string, userId: string): Promise<boolean>;
  revokeSession(id: string): Promise<void>;
  createAuthFlow(id: string, expiresAt: number): Promise<void>;
  consumeAuthFlow(id: string): Promise<boolean>;
  createUser(user: User): Promise<User>;
  addPasskey(userId: string, passkey: StoredPasskey): Promise<User>;
  updatePasskey(
    userId: string,
    credentialId: string,
    update: Pick<StoredPasskey, 'counter' | 'deviceType' | 'backedUp' | 'lastUsedAt'>,
  ): Promise<User>;
  removePasskey(userId: string, credentialId: string): Promise<User>;
  reservePasswordAttempt(key: string): Promise<boolean>;
  clearPasswordAttempts(key: string): Promise<void>;
}

export interface StateRepository {
  getOrCreate(user: User): Promise<UserState>;
  replace(user: User, candidate: unknown, expectedRevision: number | null): Promise<UserState>;
  mutate(user: User, operation: (state: UserState) => void): Promise<UserState>;
}
