import { randomUUID } from 'node:crypto';
import type { WorkoutExercise, WorkoutSession, WorkoutSet } from '../../domain/models.js';
import type { StateRepository } from '../../repositories/contracts.js';
import type { ProgressionService } from '../../services/progression.service.js';
import type { SessionService } from '../../services/session.service.js';
import {
  isoDate,
  isoDateTime,
  nullableStringField,
  numberField,
  objectBody,
  stringField,
} from '../../utils/validation.js';
import { badRequest, conflict, notFound } from '../errors.js';
import { readJsonBody } from '../request.js';
import { json } from '../response.js';
import type { Router } from '../router.js';
import { validateWorkoutExercises } from '../../utils/state-validation.js';

export function registerWorkoutRoutes(
  router: Router,
  sessions: SessionService,
  states: StateRepository,
  progression: ProgressionService,
): void {
  router.add('GET', '/api/workouts/previous/:exerciseId', async ({ request, response, params }) => {
    const user = await sessions.requireUser(request);
    const state = await states.getOrCreate(user);
    json(response, 200, {
      exercise: progression.previousPerformance(state, params.exerciseId!),
    });
  });

  router.add('POST', '/api/workouts', async ({ request, response }) => {
    const user = await sessions.requireUser(request);
    const body = objectBody(await readJsonBody(request));
    const session = parseNewWorkout(body);
    const state = await states.mutate(user, (draft) => {
      if (draft.workoutSessions.some((candidate) => candidate.status === 'active')) {
        throw conflict('Complete or cancel the active workout before starting another');
      }
      draft.workoutSessions.push(session);
    });
    response.setHeader('ETag', `"${state.revision}"`);
    json(response, 201, session);
  });

  router.add('PATCH', '/api/workouts/:sessionId', async ({ request, response, params }) => {
    const user = await sessions.requireUser(request);
    const body = objectBody(await readJsonBody(request));
    let updated!: WorkoutSession;
    const state = await states.mutate(user, (draft) => {
      const session = draft.workoutSessions.find((candidate) => candidate.id === params.sessionId);
      if (!session) throw notFound('Workout session not found');
      if (session.status !== 'active') throw conflict('Only active workouts can be edited');
      if (body.exercises !== undefined) session.exercises = parseExercises(body.exercises);
      if (body.notes !== undefined) session.notes = nullableStringField(body, 'notes', 2_000);
      if (body.scheduledDate !== undefined) {
        session.scheduledDate = isoDate(stringField(body, 'scheduledDate')!, 'scheduledDate');
      }
      updated = structuredClone(session);
    });
    response.setHeader('ETag', `"${state.revision}"`);
    json(response, 200, updated);
  });

  router.add('POST', '/api/workouts/:sessionId/complete', async ({ request, response, params }) => {
    const user = await sessions.requireUser(request);
    let completed!: WorkoutSession;
    const state = await states.mutate(user, (draft) => {
      completed = structuredClone(progression.completeSession(draft, params.sessionId!));
    });
    response.setHeader('ETag', `"${state.revision}"`);
    json(response, 200, { session: completed, progression: state.progression });
  });

  router.add('POST', '/api/workouts/:sessionId/cancel', async ({ request, response, params }) => {
    const user = await sessions.requireUser(request);
    let cancelled!: WorkoutSession;
    const state = await states.mutate(user, (draft) => {
      const session = draft.workoutSessions.find((candidate) => candidate.id === params.sessionId);
      if (!session) throw notFound('Workout session not found');
      if (session.status === 'completed') throw conflict('Completed workout cannot be cancelled');
      session.status = 'cancelled';
      session.completedAt = new Date().toISOString();
      cancelled = structuredClone(session);
    });
    response.setHeader('ETag', `"${state.revision}"`);
    json(response, 200, cancelled);
  });
}

function parseNewWorkout(body: Record<string, unknown>): WorkoutSession {
  const now = new Date().toISOString();
  const planDayIdValue = body.planDayId;
  if (planDayIdValue !== undefined && planDayIdValue !== null && typeof planDayIdValue !== 'string') {
    throw badRequest('planDayId must be a string or null');
  }
  return {
    id: randomUUID(),
    planDayId: typeof planDayIdValue === 'string' ? planDayIdValue.slice(0, 128) : null,
    scheduledDate: isoDate(
      stringField(body, 'scheduledDate', { optional: true }) ?? now.slice(0, 10),
      'scheduledDate',
    ),
    startedAt: isoDateTime(stringField(body, 'startedAt', { optional: true }) ?? now, 'startedAt'),
    completedAt: null,
    status: 'active',
    exercises: body.exercises === undefined ? [] : parseExercises(body.exercises),
    notes: nullableStringField(body, 'notes', 2_000),
  };
}

function parseExercises(value: unknown): WorkoutExercise[] {
  if (!Array.isArray(value) || value.length > 100) throw badRequest('exercises must be an array of at most 100 items');
  const parsed = value.map((candidate, index) => {
    const exercise = objectBody(candidate);
    const setsValue = exercise.sets;
    if (!Array.isArray(setsValue) || setsValue.length > 100) {
      throw badRequest(`exercises[${index}].sets must be an array of at most 100 items`);
    }
    return {
      exerciseId: stringField(exercise, 'exerciseId', { max: 128 })!,
      sets: setsValue.map((set, setIndex) => parseSet(set, setIndex)),
      estimatedOneRepMaxKg: null,
      notes: nullableStringField(exercise, 'notes', 1_000),
      ...(exercise.prescription === undefined ? {} : { prescription: structuredClone(exercise.prescription) as WorkoutExercise['prescription'] }),
      ...(exercise.block === undefined ? {} : { block: structuredClone(exercise.block) as WorkoutExercise['block'] }),
    };
  });
  validateWorkoutExercises(parsed, 'exercises');
  return parsed as WorkoutExercise[];
}

function parseSet(value: unknown, index: number): WorkoutSet {
  const set = objectBody(value);
  const side = set.side;
  if (side !== undefined && side !== null && side !== 'left' && side !== 'right') {
    throw badRequest(`sets[${index}].side must be left, right, or null`);
  }
  return {
    setNumber: numberField(set, 'setNumber', { integer: true, min: 1, max: 100 })!,
    loadKg: nullableNumber(set, 'loadKg', 0, 2_000),
    repetitions: nullableNumber(set, 'repetitions', 0, 1_000, true),
    durationSeconds: nullableNumber(set, 'durationSeconds', 0, 86_400, true),
    side: side === 'left' || side === 'right' ? side : null,
    rpe: nullableNumber(set, 'rpe', 1, 10),
    rir: nullableNumber(set, 'rir', 0, 10),
    completedAt: set.completedAt === null || set.completedAt === undefined
      ? null
      : isoDateTime(String(set.completedAt), `sets[${index}].completedAt`),
  };
}

function nullableNumber(
  object: Record<string, unknown>,
  key: string,
  min: number,
  max: number,
  integer = false,
): number | null {
  if (object[key] === null || object[key] === undefined) return null;
  return numberField(object, key, { min, max, integer })!;
}
