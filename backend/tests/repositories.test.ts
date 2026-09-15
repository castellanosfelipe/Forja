import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { User } from '../src/domain/models.js';
import { DatabaseRepository } from '../src/repositories/database.repository.js';
import { UserStateRepository } from '../src/repositories/user-state.repository.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

function user(): User {
  return {
    id: 'a3c28a29-2fb3-46c1-ac7e-e5c8ef649eee',
    webauthnUserId: 'dGVzdC11c2VyLWlk',
    username: 'athlete',
    displayName: 'Athlete',
    stateFileKey: 'athlete',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    passkeys: [],
    passwordCredential: null,
  };
}

describe('JSON repositories', () => {
  it('initializes and atomically persists users', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'forja-db-'));
    temporaryDirectories.push(directory);
    const path = join(directory, 'db.json');
    const repository = new DatabaseRepository(path);
    await repository.initialize();
    await repository.createUser(user());

    expect((await repository.findUserByUsername('ATHLETE'))?.id).toBe(user().id);
    expect(JSON.parse(await readFile(path, 'utf8')).users).toHaveLength(1);
  });

  it('persists session revocation and single-use ceremonies across repository restarts', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'forja-auth-persistence-'));
    temporaryDirectories.push(directory);
    const path = join(directory, 'db.json');
    const first = new DatabaseRepository(path);
    await first.initialize();
    await first.createUser(user());
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    await first.createSession('test-session', user().id, expiresAt);
    await first.createAuthFlow('test-flow', expiresAt);
    const second = new DatabaseRepository(path);
    await second.initialize();
    expect(await second.hasSession('test-session', user().id)).toBe(true);
    expect(await second.consumeAuthFlow('test-flow')).toBe(true);
    await second.revokeSession('test-session');
    const third = new DatabaseRepository(path);
    await third.initialize();
    expect(await third.hasSession('test-session', user().id)).toBe(false);
    expect(await third.consumeAuthFlow('test-flow')).toBe(false);
  });

  it('creates isolated user state and enforces revisions', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'forja-state-'));
    temporaryDirectories.push(directory);
    const repository = new UserStateRepository(directory);
    const initial = await repository.getOrCreate(user());
    const updated = await repository.mutate(user(), (state) => {
      state.preferences = { locale: 'es-CO' };
    });

    expect(initial.revision).toBe(1);
    expect(initial.bodyMetrics).toEqual({
      profile: { sex: null, ageYears: null, heightCm: null, activityLevel: 'moderate', goal: 'maintain' },
      entries: [],
    });
    expect(initial.exerciseLibrary).toHaveLength(195);
    expect(initial.bodyMeasurementReminder).toMatchObject({ enabled: true, intervalMonths: 1, lastNotifiedAt: null });
    expect(initial.onboarding).toMatchObject({ completedAt: null, trainingGoal: 'hypertrophy', trainingDaysPerWeek: 3, methodologyVersion: 'forja-safe-v1' });
    expect(Date.parse(initial.bodyMeasurementReminder.nextDueAt)).toBeGreaterThan(Date.parse(initial.owner.createdAt));
    expect(new Set(initial.exerciseLibrary.map((exercise) => exercise.category)).size).toBe(16);
    expect(updated.revision).toBe(2);
    await expect(repository.replace(user(), updated, 1)).rejects.toMatchObject({ statusCode: 409 });
  });

  it('migra estados existentes al asistente inicial sin perder datos', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'forja-state-migration-'));
    temporaryDirectories.push(directory);
    const repository = new UserStateRepository(directory);
    const initial = await repository.getOrCreate(user());
    const path = join(directory, 'state-athlete.json');
    const legacy = structuredClone(initial) as Partial<typeof initial>;
    delete legacy.onboarding;
    await writeFile(path, `${JSON.stringify(legacy, null, 2)}\n`, 'utf8');

    const migrated = await repository.getOrCreate(user());

    expect(migrated.revision).toBe(2);
    expect(migrated.onboarding.completedAt).toBeNull();
    expect(migrated.exerciseLibrary).toHaveLength(195);
    expect(migrated.bodyWeight).toEqual(initial.bodyWeight);
  });
});
