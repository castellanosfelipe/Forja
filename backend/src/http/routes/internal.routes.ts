import { timingSafeEqual } from 'node:crypto';
import type { AppConfig } from '../../config/env.js';
import type { PushService } from '../../services/push.service.js';
import { unauthorized } from '../errors.js';
import { readRawBody } from '../request.js';
import { json, noContent } from '../response.js';
import type { Router } from '../router.js';

export function registerInternalRoutes(router: Router, config: AppConfig, push: PushService): void {
  router.add('POST', '/api/internal/qstash', async ({ request, response }) => {
    const signature = headerValue(request.headers['upstash-signature']);
    await push.handleDurableDelivery(await readRawBody(request), signature);
    noContent(response);
  });

  router.add('GET', '/api/internal/notifications', async ({ request, response }) => {
    const supplied = headerValue(request.headers.authorization);
    const expected = config.cronSecret ? `Bearer ${config.cronSecret}` : '';
    if (!expected || !supplied || !safeEqual(supplied, expected)) {
      throw unauthorized('Invalid scheduler credentials');
    }
    json(response, 200, { ok: true, processed: await push.processDueNotifications() });
  });
}

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
