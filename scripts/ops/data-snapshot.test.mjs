import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { backupData, restoreData, verifySnapshot } from './data-snapshot.mjs';

test('backup and restore preserve bytes without replacing any existing directory', async () => {
  const root = await mkdtemp(join(tmpdir(), 'forja-backup-test-'));
  const data = join(root, 'data'); const backup = join(root, 'backup'); const restored = join(root, 'restored');
  await mkdir(data);
  await writeFile(join(data, 'db.json'), '{"users":[]}');
  await writeFile(join(data, 'state-fiction.json'), '{"revision":1}');
  await assert.rejects(backupData(data, backup, false), /offline/);
  assert.equal(await backupData(data, backup, true), 2);
  assert.equal((await verifySnapshot(backup)).files.length, 2);
  assert.equal(await restoreData(backup, restored), 2);
  assert.deepEqual(await readFile(join(restored, 'state-fiction.json')), await readFile(join(data, 'state-fiction.json')));
  await assert.rejects(backupData(data, backup, true), { code: 'EEXIST' });
  await assert.rejects(restoreData(backup, data), { code: 'EEXIST' });
  await writeFile(join(backup, 'state-fiction.json'), '{}');
  await assert.rejects(verifySnapshot(backup), /dañada/);
});

test('restore rejects path traversal before writing anything', async () => {
  const root = await mkdtemp(join(tmpdir(), 'forja-backup-invalid-test-'));
  await writeFile(join(root, 'snapshot.json'), JSON.stringify({ version: 1, files: [{ name: '../db.json', sha256: 'bad', bytes: 0 }] }));
  await assert.rejects(restoreData(root, join(root, 'restored')), /inválidos/);
});
