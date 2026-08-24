import type { PushService } from '../../services/push.service.js';
import type { SessionService } from '../../services/session.service.js';
import { numberField, objectBody, stringField } from '../../utils/validation.js';
import { readJsonBody } from '../request.js';
import { json, noContent } from '../response.js';
import type { Router } from '../router.js';

export function registerPushRoutes(router: Router, sessions: SessionService, push: PushService): void {
  router.add('GET', '/api/push/vapid-public-key', async ({ request, response }) => {
    await sessions.requireUser(request);
    json(response, 200, { publicKey: push.publicKey() });
  });

  router.add('POST', '/api/push/subscriptions', async ({ request, response }) => {
    const user = await sessions.requireUser(request);
    const subscription = await push.subscribe(user, await readJsonBody(request));
    json(response, 201, subscription);
  });

  router.add('DELETE', '/api/push/subscriptions/:subscriptionId', async ({ request, response, params }) => {
    const user = await sessions.requireUser(request);
    await push.unsubscribe(user, params.subscriptionId!);
    noContent(response);
  });

  router.add('POST', '/api/push/rest-timers', async ({ request, response }) => {
    const user = await sessions.requireUser(request);
    const body = objectBody(await readJsonBody(request));
    const durationSeconds = numberField(body, 'durationSeconds', { integer: true, min: 1, max: 86_400 })!;
    const title = stringField(body, 'title', { optional: true, max: 100 }) ?? 'Descanso terminado';
    const notificationBody = stringField(body, 'body', { optional: true, max: 240 }) ?? 'Es hora de comenzar la siguiente serie.';
    const timer = await push.scheduleRestTimer(user, durationSeconds, title, notificationBody);
    json(response, 201, timer);
  });

  router.add('POST', '/api/push/body-measurement-reminder/sync', async ({ request, response }) => {
    const user = await sessions.requireUser(request);
    const reminder = await push.syncMeasurementReminder(user);
    json(response, 200, reminder);
  });

  router.add('DELETE', '/api/push/rest-timers/:timerId', async ({ request, response, params }) => {
    const user = await sessions.requireUser(request);
    await push.cancelRestTimer(user, params.timerId!);
    noContent(response);
  });
}
