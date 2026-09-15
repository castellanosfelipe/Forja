import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const allowedName = /^(db|state-[A-Za-z0-9_-]+)\.json$/;
const checksum = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function readRegular(directory, name) {
  if (!allowedName.test(name)) throw new Error('Nombre de archivo no permitido en la copia.');
  const path = resolve(directory, name);
  if (!(await lstat(path)).isFile()) throw new Error('La copia no admite enlaces ni directorios como datos.');
  const bytes = await readFile(path);
  JSON.parse(bytes.toString('utf8'));
  return bytes;
}

export async function verifySnapshot(directory) {
  const path = resolve(directory, 'snapshot.json');
  if (!(await lstat(path)).isFile()) throw new Error('El manifiesto debe ser un archivo regular.');
  const manifest = JSON.parse(await readFile(path, 'utf8'));
  if (manifest.version !== 1 || !Array.isArray(manifest.files) || !manifest.files.length || manifest.files.length > 100_000) throw new Error('Manifiesto de copia inválido.');
  const names = new Set();
  for (const entry of manifest.files) {
    if (typeof entry.name !== 'string' || !allowedName.test(entry.name) || names.has(entry.name)) throw new Error('Archivos inválidos o duplicados en el manifiesto.');
    names.add(entry.name);
    const bytes = await readRegular(directory, entry.name);
    if (entry.sha256 !== checksum(bytes) || entry.bytes !== bytes.length) throw new Error('La copia está dañada o fue modificada.');
  }
  if (!names.has('db.json')) throw new Error('La copia no contiene db.json.');
  return manifest;
}

export async function backupData(source, destination, offline) {
  if (!offline) throw new Error('Detén el backend y confirma --offline antes de copiar.');
  source = resolve(source); destination = resolve(destination);
  if (destination === source || destination.startsWith(source + sep)) throw new Error('Guarda la copia fuera del directorio de datos.');
  if (!(await lstat(source)).isDirectory()) throw new Error('El origen debe ser un directorio real.');
  const names = (await readdir(source)).filter((name) => allowedName.test(name)).sort();
  if (!names.includes('db.json')) throw new Error('El origen no contiene db.json.');
  const files = [];
  await mkdir(destination, { mode: 0o700 }); // Exclusive destination: never overwrite an existing copy.
  for (const name of names) {
    const bytes = await readRegular(source, name);
    await writeFile(resolve(destination, name), bytes, { flag: 'wx', mode: 0o600 });
    files.push({ name, bytes: bytes.length, sha256: checksum(bytes) });
  }
  const after = (await readdir(source)).filter((name) => allowedName.test(name)).sort();
  if (JSON.stringify(names) !== JSON.stringify(after)) throw new Error('El origen cambió durante la copia. No uses esta copia.');
  for (const entry of files) {
    if (checksum(await readRegular(source, entry.name)) !== entry.sha256) throw new Error('El backend está escribiendo. Detén el servicio y crea otra copia.');
  }
  await writeFile(resolve(destination, 'snapshot.json'), JSON.stringify({ version: 1, createdAt: new Date().toISOString(), files }, null, 2), { flag: 'wx', mode: 0o600 });
  await verifySnapshot(destination);
  return files.length;
}

export async function restoreData(source, destination) {
  source = resolve(source); destination = resolve(destination);
  const manifest = await verifySnapshot(source);
  await mkdir(destination, { mode: 0o700 }); // Restore only into a NEW directory, never over live data.
  for (const entry of manifest.files) {
    const bytes = await readRegular(source, entry.name);
    if (checksum(bytes) !== entry.sha256) throw new Error('La copia cambió durante la restauración.');
    await writeFile(resolve(destination, entry.name), bytes, { flag: 'wx', mode: 0o600 });
  }
  return manifest.files.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [action, source, destination, flag] = process.argv.slice(2);
  try {
    if (action === 'verify' && source && !destination) {
      const result = await verifySnapshot(resolve(source));
      console.info(`Copia íntegra: ${result.files.length} archivos.`);
    } else if (['backup', 'restore'].includes(action) && source && destination) {
      const count = action === 'backup' ? await backupData(source, destination, flag === '--offline') : await restoreData(source, destination);
      console.info(`${action === 'backup' ? 'Copia verificada' : 'Restauración en directorio nuevo'}: ${count} archivos. Protege el destino: contiene información privada.`);
    } else throw new Error('Uso: node scripts/ops/data-snapshot.mjs backup ORIGEN DESTINO_NUEVO --offline | verify COPIA | restore COPIA DESTINO_NUEVO');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
