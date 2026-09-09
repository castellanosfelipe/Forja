import { copyFile, mkdir, readdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { GYM_EXERCISE_CATALOG } from '../backend/src/domain/exercise-catalog.ts';
import {
  FORJA_GENERATED_MEDIA_IDS,
  FREE_EXERCISE_DB_MEDIA_OVERRIDES,
  FREE_EXERCISE_DB_MAPPINGS,
  REPDB_ALIASES,
} from '../frontend/src/features/exercises/media/source-map.ts';
import type {
  ExerciseMedia,
  ExerciseMediaFrame,
  ExerciseMediaFrameLabel,
} from '../frontend/src/features/exercises/media/types.ts';
import { FORJA_GENERATED_GUIDANCE } from '../frontend/src/features/exercises/media/generated-guidance.ts';
import { FREE_EXERCISE_DB_GUIDANCE } from '../frontend/src/features/exercises/media/free-exercise-db-guidance.ts';

interface RepDbExercise {
  id: string;
  description_es?: string;
  instructions_es?: string[];
  tips_es?: string[];
  images: { flat: Partial<Record<'start' | 'peak' | 'main', string>> };
}

interface FreeExercise {
  id: string;
  images: string[];
}

const projectRoot = path.resolve(process.cwd());
const repDbRoot = path.join(projectRoot, 'work', 'vendor', 'repdb-exercise-dataset');
const freeDbRoot = path.join(projectRoot, 'work', 'vendor', 'free-exercise-db');
const publicMediaRoot = path.join(projectRoot, 'frontend', 'public', 'exercise-media');
const registryPath = path.join(projectRoot, 'frontend', 'src', 'features', 'exercises', 'media', 'registry.json');

let repDbById = new Map<string, RepDbExercise>();
let freeDbById = new Map<string, FreeExercise>();

async function main(): Promise<void> {
  const repDbDocument = JSON.parse(await readFile(path.join(repDbRoot, 'exercises.json'), 'utf8')) as { exercises: RepDbExercise[] };
  const freeDbDocument = JSON.parse(await readFile(path.join(freeDbRoot, 'dist', 'exercises.json'), 'utf8')) as FreeExercise[];
  repDbById = new Map(repDbDocument.exercises.map((exercise) => [exercise.id, exercise]));
  freeDbById = new Map(freeDbDocument.map((exercise) => [exercise.id, exercise]));

  await Promise.all([
    mkdir(path.join(publicMediaRoot, 'repdb'), { recursive: true }),
    mkdir(path.join(publicMediaRoot, 'free-exercise-db'), { recursive: true }),
  ]);

  const registry: ExerciseMedia[] = [];
  for (const exercise of GYM_EXERCISE_CATALOG) {
    if (FORJA_GENERATED_MEDIA_IDS.has(exercise.id)) {
      const guidance = FORJA_GENERATED_GUIDANCE[exercise.id] ?? FREE_EXERCISE_DB_GUIDANCE[exercise.id];
      if (!guidance) throw new Error(`Falta la guía exacta del recurso generado '${exercise.id}'.`);
      const relativePath = `/exercise-media/forja/${exercise.id}.jpg`;
      await assertFile(path.join(projectRoot, 'frontend', 'public', relativePath.slice(1)));
      registry.push({
        id: exercise.id,
        sourceId: exercise.id,
        source: 'forja',
        frames: [{ src: relativePath, label: 'Secuencia' }],
        description: guidance.description,
        instructions: guidance.instructions,
        tips: guidance.tips,
      });
      continue;
    }

    const repDbId = repDbById.has(exercise.id) ? exercise.id : REPDB_ALIASES[exercise.id];
    if (repDbId) {
      const sourceExercise = repDbById.get(repDbId);
      if (!sourceExercise) throw new Error(`No existe el ejercicio RepDB '${repDbId}' asignado a '${exercise.id}'.`);
      registry.push(await importRepDbExercise(exercise.id, sourceExercise));
      continue;
    }

    const freeDbId = FREE_EXERCISE_DB_MAPPINGS[exercise.id];
    if (freeDbId) {
      const sourceExercise = freeDbById.get(freeDbId);
      if (!sourceExercise) throw new Error(`No existe el ejercicio Free Exercise DB '${freeDbId}' asignado a '${exercise.id}'.`);
      registry.push(await importFreeDbExercise(exercise.id, sourceExercise));
      continue;
    }

    throw new Error(`El ejercicio '${exercise.id}' no tiene una demostración exacta asignada.`);
  }

  const uniqueIds = new Set(registry.map((item) => item.id));
  if (uniqueIds.size !== GYM_EXERCISE_CATALOG.length) {
    throw new Error('El registro de medios contiene IDs duplicados o perdió ejercicios del catálogo.');
  }

  const referencedFiles = new Set(registry.flatMap((item) => item.frames.map((frame) => path.join(projectRoot, 'frontend', 'public', frame.src.slice(1)))));
  await Promise.all([
    pruneUnreferencedFiles(path.join(publicMediaRoot, 'repdb'), referencedFiles),
    pruneUnreferencedFiles(path.join(publicMediaRoot, 'free-exercise-db'), referencedFiles),
  ]);
  await writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`, 'utf8');
  console.log(`Registro generado: ${registry.length} ejercicios, ${registry.reduce((total, item) => total + item.frames.length, 0)} imágenes.`);
}

async function importRepDbExercise(forjaId: string, source: RepDbExercise): Promise<ExerciseMedia> {
  const frames: ExerciseMediaFrame[] = [];
  const phases: Array<{ key: 'start' | 'peak' | 'main'; label: ExerciseMediaFrameLabel }> = [
    { key: 'start', label: 'Inicio' },
    { key: 'peak', label: 'Punto clave' },
    { key: 'main', label: 'Demostración' },
  ];

  for (const phase of phases) {
    const sourceRelativePath = source.images.flat[phase.key];
    if (!sourceRelativePath) continue;
    const extension = path.extname(sourceRelativePath).toLowerCase();
    const fileName = `${safeName(source.id)}-${phase.key}${extension}`;
    await copyFile(path.join(repDbRoot, sourceRelativePath), path.join(publicMediaRoot, 'repdb', fileName));
    frames.push({ src: `/exercise-media/repdb/${fileName}`, label: phase.label });
  }

  if (frames.length === 0) throw new Error(`RepDB '${source.id}' no contiene imágenes planas utilizables.`);
  const media: ExerciseMedia = {
    id: forjaId,
    sourceId: source.id,
    source: 'repdb',
    frames,
    instructions: source.instructions_es ?? [],
    tips: source.tips_es ?? [],
  };
  if (source.description_es) media.description = source.description_es;
  return media;
}

async function importFreeDbExercise(forjaId: string, source: FreeExercise): Promise<ExerciseMedia> {
  if (source.images.length === 0) throw new Error(`Free Exercise DB '${source.id}' no contiene imágenes.`);
  const guidance = FREE_EXERCISE_DB_GUIDANCE[forjaId];
  if (!guidance) throw new Error(`Falta la guía exacta de Free Exercise DB para '${forjaId}'.`);
  const override = FREE_EXERCISE_DB_MEDIA_OVERRIDES[forjaId];
  const frameOrder = override?.frameOrder ?? source.images.slice(0, 2).map((_, index) => index);
  const labels: readonly ExerciseMediaFrameLabel[] = override?.frameLabels
    ?? (source.images.length === 1 ? ['Demostración'] : ['Inicio', 'Final']);
  const frames: ExerciseMediaFrame[] = [];

  for (const [position, sourceIndex] of frameOrder.entries()) {
    const sourceRelativePath = source.images[sourceIndex];
    if (!sourceRelativePath) throw new Error(`Free Exercise DB '${source.id}' no contiene la fase ${sourceIndex}.`);
    const extension = path.extname(sourceRelativePath).toLowerCase();
    const fileName = `${safeName(source.id)}-${sourceIndex}${extension}`;
    await copyFile(path.join(freeDbRoot, 'exercises', sourceRelativePath), path.join(publicMediaRoot, 'free-exercise-db', fileName));
    frames.push({ src: `/exercise-media/free-exercise-db/${fileName}`, label: labels[position] ?? 'Punto clave' });
  }

  for (const supplemental of override?.supplementalRepDbFrames ?? []) {
    const sourceExercise = repDbById.get(supplemental.sourceId);
    if (!sourceExercise) throw new Error(`No existe el complemento RepDB '${supplemental.sourceId}' para '${forjaId}'.`);
    const sourceRelativePath = sourceExercise.images.flat[supplemental.phase];
    if (!sourceRelativePath) throw new Error(`RepDB '${supplemental.sourceId}' no contiene la fase '${supplemental.phase}'.`);
    const extension = path.extname(sourceRelativePath).toLowerCase();
    const fileName = `${safeName(supplemental.sourceId)}-${supplemental.phase}${extension}`;
    await copyFile(path.join(repDbRoot, sourceRelativePath), path.join(publicMediaRoot, 'repdb', fileName));
    frames.push({ src: `/exercise-media/repdb/${fileName}`, label: supplemental.label });
  }

  return {
    id: forjaId,
    sourceId: source.id,
    source: 'free-exercise-db',
    frames,
    description: guidance.description,
    instructions: guidance.instructions,
    tips: guidance.tips,
  };
}

function safeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function assertFile(filePath: string): Promise<void> {
  const details = await stat(filePath).catch(() => null);
  if (!details?.isFile() || details.size === 0) throw new Error(`Falta el recurso generado '${filePath}'.`);
}

async function pruneUnreferencedFiles(directory: string, referencedFiles: Set<string>): Promise<void> {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const filePath = path.join(directory, entry.name);
    if (!referencedFiles.has(filePath)) await unlink(filePath);
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
