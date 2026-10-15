import { describe, expect, it, vi } from 'vitest';
import { createServer } from 'node:http';
import { mkdtemp, rm, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

describe('Vercel Node entrypoint', () => {
  it('serves nested API paths and preserves the signed QStash payload', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'forja-vercel-entrypoint-'));
    const environment = {
      NODE_ENV: 'test', VERCEL: '0', DATABASE_URL: '', DATA_DIR: directory,
      RP_ID: 'localhost', EXPECTED_ORIGIN: 'http://localhost:8080',
      PUBLIC_APP_URL: 'http://localhost:8080', SESSION_SECRET: 'test-session-secret-that-is-long-enough',
      QSTASH_TOKEN: 'token', QSTASH_CURRENT_SIGNING_KEY: 'current', QSTASH_NEXT_SIGNING_KEY: 'next',
      VAPID_SUBJECT: '', VAPID_PUBLIC_KEY: '', VAPID_PRIVATE_KEY: '',
    };
    for (const [key, value] of Object.entries(environment)) vi.stubEnv(key, value);
    mocks.verify.mockReset().mockResolvedValue(true);
    const { default: handler } = await import('../../api/index.js');
    const server = createServer((request, response) => { void handler(request, response); });
    try {
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Server did not expose a TCP address');
      const origin = `http://127.0.0.1:${address.port}`;
      const session = await fetch(`${origin}/api/auth/session`);
      expect(session.status).toBe(200);
      await expect(session.json()).resolves.toEqual({ authenticated: false, user: null });

      const body = '{\n  "kind": "rest-timer", "userId": "missing-user", "timerId": "timer"\n}\n';
      const delivery = await fetch(`${origin}/api/internal/qstash`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'upstash-signature': 'signature' },
        body,
      });
      expect(delivery.status).toBe(204);
      expect(mocks.verify).toHaveBeenCalledWith({
        signature: 'signature', body, url: 'http://localhost:8080/api/internal/qstash', clockTolerance: 5,
      });
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      vi.unstubAllEnvs();
      await rm(join(directory, 'db.json'), { force: true });
      await rmdir(directory);
    }
  });
});
