import { describe, expect, it, vi } from 'vitest';
import type { AppConfig } from '../src/config/env.js';
import { loadConfig } from '../src/config/env.js';
import type { User, UserState } from '../src/domain/models.js';
import type { AccountRepository, StateRepository } from '../src/repositories/contracts.js';

const mocks = vi.hoisted(() => ({ publish: vi.fn(), verify: vi.fn(), vapid: vi.fn() }));
vi.mock('@upstash/qstash', () => ({
  Client: class { public readonly publishJSON = mocks.publish; },
  Receiver: class { public readonly verify = mocks.verify; },
}));
vi.mock('web-push', () => ({ default: { setVapidDetails: mocks.vapid, sendNotification: vi.fn() } }));

import { PushService } from '../src/services/push.service.js';

describe('Vercel runtime configuration', () => {
  it('requires Neon and durable scheduler credentials on Vercel', () => {
    expect(() => loadConfig({
      NODE_ENV: 'production',
      VERCEL: '1',
      RP_ID: 'forja.example.com',
      EXPECTED_ORIGIN: 'https://forja.example.com',
      SESSION_SECRET: 'a'.repeat(48),
    })).toThrow(/DATABASE_URL/);
  });

  it('accepts a complete Vercel, Neon and QStash configuration', () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      VERCEL: '1',
      DATABASE_URL: 'postgresql://user:secret@example.invalid/forja',
      RP_ID: 'forja.example.com',
      EXPECTED_ORIGIN: 'https://forja.example.com',
      PUBLIC_APP_URL: 'https://forja.example.com',
      SESSION_SECRET: 'a'.repeat(48),
      CRON_SECRET: 'b'.repeat(32),
      QSTASH_TOKEN: 'token',
      QSTASH_CURRENT_SIGNING_KEY: 'current',
      QSTASH_NEXT_SIGNING_KEY: 'next',
      VAPID_SUBJECT: 'mailto:admin@example.com',
      VAPID_PUBLIC_KEY: 'public',
      VAPID_PRIVATE_KEY: 'private',
    });
    expect(config).toMatchObject({
      serverless: true,
      databaseUrl: expect.stringMatching(/^postgresql:/),
      publicAppUrl: 'https://forja.example.com',
    });
  });
});

describe('durable rest timer scheduling', () => {
  it('persists the timer and schedules an authenticated QStash callback', async () => {
    mocks.publish.mockReset().mockResolvedValue({ messageId: 'msg' });
    const user = { id: 'user', stateFileKey: 'state' } as User;
    const state = {
      revision: 1,
      pushSubscriptions: [{ id: 'sub' }],
      restTimers: [],
    } as unknown as UserState;
    const states = {
      getOrCreate: async () => structuredClone(state),
      mutate: async (_user: User, change: (draft: UserState) => void) => {
        change(state);
        state.revision += 1;
        return structuredClone(state);
      },
    } as StateRepository;
    const accounts = {} as AccountRepository;
    const service = new PushService({
      serverless: true,
      publicAppUrl: 'https://forja.example.com',
      expectedOrigins: ['https://forja.example.com'],
      vapid: { subject: 'mailto:test@example.com', publicKey: 'public', privateKey: 'private' },
      qstash: { token: 'token', currentSigningKey: 'current', nextSigningKey: 'next' },
    } as AppConfig, states, accounts);

    const timer = await service.scheduleRestTimer(user, 90, 'Descanso', 'Siguiente serie');

    expect(state.restTimers).toContainEqual(timer);
    expect(mocks.publish).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://forja.example.com/api/internal/qstash',
      body: { kind: 'rest-timer', userId: user.id, timerId: timer.id },
      deduplicationId: `forja-rest-${timer.id}`,
    }));
    service.shutdown();
  });
});
