import { access, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { neon } from '@neondatabase/serverless';
import type { UserState } from '../../backend/src/domain/models.js';
import { DatabaseRepository } from '../../backend/src/repositories/database.repository.js';
import { NeonDatabaseRepository } from '../../backend/src/repositories/neon-database.repository.js';
import { createEmptyState, normalizeAndValidateState } from '../../backend/src/repositories/user-state.document.js';

const sourceDirectory = resolve(argumentValue('--source') ?? './data');
const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) throw new Error('Define DATABASE_URL antes de ejecutar la migración');
if (!/^postgres(?:ql)?:\/\//i.test(databaseUrl)) throw new Error('DATABASE_URL no es una conexión PostgreSQL válida');

const sourceDatabasePath = join(sourceDirectory, 'db.json');
await access(sourceDatabasePath);
const sourceRepository = new DatabaseRepository(sourceDatabasePath);
await sourceRepository.initialize();
const source = await sourceRepository.snapshot();

const states = await Promise.all(source.users.map(async (user) => {
  const path = join(sourceDirectory, `state-${user.stateFileKey}.json`);
  let state: UserState;
  try {
    state = JSON.parse(await readFile(path, 'utf8')) as UserState;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    state = createEmptyState(user);
  }
  const normalized = normalizeAndValidateState(state, user);
  const responseBytes = Buffer.byteLength(JSON.stringify(normalized));
  if (responseBytes > 4_000_000) {
    throw new Error(`El estado de ${user.username} ocupa ${responseBytes} bytes y supera el margen seguro de Vercel`);
  }
  return { user, state: normalized };
}));

const targetRepository = new NeonDatabaseRepository(databaseUrl);
await targetRepository.initialize();
const sql = neon(databaseUrl);
const counts = await sql`SELECT
  (SELECT count(*) FROM forja_users)::int AS users,
  (SELECT count(*) FROM forja_user_states)::int AS states`;
if (Number(counts[0]?.users ?? 0) !== 0 || Number(counts[0]?.states ?? 0) !== 0) {
  throw new Error('La base Neon de destino no está vacía. Usa un proyecto o una rama nueva para evitar sobrescrituras.');
}

if (process.argv.includes('--dry-run')) {
  console.info(JSON.stringify({ ok: true, dryRun: true, users: states.length, sourceDirectory }));
  process.exit(0);
}

const queries = states.flatMap(({ user, state }) => [
  sql`INSERT INTO forja_users (id, username_key, state_file_key, document)
      VALUES (${user.id}, ${user.username.toLocaleLowerCase('en-US')}, ${user.stateFileKey}, ${JSON.stringify(user)}::jsonb)`,
  ...user.passkeys.map((passkey) => sql`INSERT INTO forja_passkeys (credential_id, user_id)
      VALUES (${passkey.id}, ${user.id})`),
  sql`INSERT INTO forja_user_states (user_id, revision, document)
      VALUES (${user.id}, ${state.revision}, ${JSON.stringify(state)}::jsonb)`,
]);

if (queries.length > 0) await sql.transaction(queries);
console.info(JSON.stringify({
  ok: true,
  users: states.length,
  passkeys: source.users.reduce((total, user) => total + user.passkeys.length, 0),
  sourceDirectory,
  sessionsMigrated: false,
}));

function argumentValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${name} requiere un valor`);
  return value;
}
