import { randomUUID } from 'node:crypto';
import type { BodyWeightEntry } from '../../domain/models.js';
import type { StateRepository } from '../../repositories/contracts.js';
import type { SessionService } from '../../services/session.service.js';
import { objectBody, isoDateTime, nullableStringField, numberField, stringField } from '../../utils/validation.js';
import { readJsonBody, parseIfMatch } from '../request.js';
import { json, noContent, stateJson } from '../response.js';
import type { Router } from '../router.js';
import { notFound } from '../errors.js';
import type { PushService } from '../../services/push.service.js';

export function registerStateRoutes(
  router: Router,
  sessions: SessionService,
  states: StateRepository,
  push: PushService,
): void {
  router.add('GET', '/api/state', async ({ request, response }) => {
    const user = await sessions.requireUser(request);
    stateJson(response, await states.getOrCreate(user));
  });

  router.add('PUT', '/api/state', async ({ request, response }) => {
    const user = await sessions.requireUser(request);
    const expectedRevision = parseIfMatch(request.headers['if-match']);
    const state = await states.replace(user, await readJsonBody(request), expectedRevision);
    push.reconcile(user, state);
    stateJson(response, state);
  });

  router.add('POST', '/api/body-weight', async ({ request, response }) => {
    const user = await sessions.requireUser(request);
    const body = objectBody(await readJsonBody(request));
    const entry: BodyWeightEntry = {
      id: randomUUID(),
      measuredAt: isoDateTime(
        stringField(body, 'measuredAt', { optional: true }) ?? new Date().toISOString(),
        'measuredAt',
      ),
      weightKg: numberField(body, 'weightKg', { min: 20, max: 500 })!,
      note: nullableStringField(body, 'note', 500),
    };
    const state = await states.mutate(user, (draft) => {
      draft.bodyWeight.entries.push(entry);
      draft.bodyWeight.entries.sort((left, right) => left.measuredAt.localeCompare(right.measuredAt));
    });
    response.setHeader('ETag', `"${state.revision}"`);
    json(response, 201, entry);
  });

  router.add('DELETE', '/api/body-weight/:entryId', async ({ request, response, params }) => {
    const user = await sessions.requireUser(request);
    await states.mutate(user, (state) => {
      const index = state.bodyWeight.entries.findIndex((entry) => entry.id === params.entryId);
      if (index === -1) throw notFound('Body-weight entry not found');
      state.bodyWeight.entries.splice(index, 1);
    });
    noContent(response);
  });
}
