import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function redactBackendEvidence(value) {
  if (Array.isArray(value)) return value.map(redactBackendEvidence);
  if (typeof value === 'string') return value.replace(/("password"\s*:\s*)"[^"]*"/g, '$1"<test-value-redacted>"');
  if (!value || typeof value !== 'object') return value;
  const result = {};
  for (const [key, child] of Object.entries(value)) {
    result[key] = ['password', 'hash', 'salt', 'privateKey', 'challenge', 'signature', 'clientDataJSON', 'attestationObject', 'authenticatorData'].includes(key)
      ? '<redacted>' : redactBackendEvidence(child);
  }
  if (result.evidence?.response && JSON.stringify(result.evidence.response) === JSON.stringify(result.observed)) {
    delete result.evidence.response;
    result.evidence.responseReference = 'observed';
  }
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const path = resolve(process.argv[2]);
  const sanitized = redactBackendEvidence(JSON.parse(await readFile(path, 'utf8')));
  await writeFile(path, JSON.stringify(sanitized, null, 2) + '\n');
  console.log(`Sanitized ${sanitized.cases.length} audit cases without re-executing tests.`);
}
