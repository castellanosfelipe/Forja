import { createECDH, randomBytes } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppConfig } from '../src/config/env.js';
import type { User, UserState } from '../src/domain/models.js';
import type { UserStateRepository } from '../src/repositories/user-state.repository.js';

const mocks = vi.hoisted(() => ({ lookup: vi.fn(), send: vi.fn(), vapid: vi.fn() }));
vi.mock('node:dns/promises', () => ({ lookup: mocks.lookup }));
vi.mock('web-push', () => ({ default: { setVapidDetails: mocks.vapid, sendNotification: mocks.send } }));
import { assertPublicPushDestination, isPublicAddress, publicPushAgent, validatePushSubscription } from '../src/utils/push-validation.js';
import { PushService } from '../src/services/push.service.js';

function subscription(endpoint = 'https://push.example.com/delivery') {
  const pair = createECDH('prime256v1');
  return { id: 'sub', endpoint, expirationTime: null, keys: { p256dh: pair.generateKeys().toString('base64url'), auth: randomBytes(16).toString('base64url') }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
}
beforeEach(() => {
  mocks.lookup.mockReset().mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
  mocks.send.mockReset().mockResolvedValue({ statusCode: 201 });
});
afterEach(() => { vi.useRealTimers(); });

describe('Push destination boundary', () => {
  it.each(['127.0.0.1', '0.0.0.0', '10.1.2.3', '100.64.0.1', '169.254.169.254', '172.16.0.1', '192.168.1.1', '198.18.0.1', '192.0.2.1', '198.51.100.1', '203.0.113.1', '224.1.2.3', '::', '::1', '::ffff:127.0.0.1', '::ffff:7f00:1', 'fc00::1', 'fe80::1', '2002:7f00:1::', '2001:db8::1'])('blocks non-public address %s', (address) => {
    expect(isPublicAddress(address)).toBe(false);
    const literal = address.includes(':') ? `[${address}]` : address;
    expect(() => validatePushSubscription(subscription(`https://${literal}/push`))).toThrow();
  });
  it.each(['http://push.example.com', 'https://user:password@push.example.com', 'https://push.example.com:9443', 'https://localhost', 'https://device.local', 'https://push.example.com/#fragment', 'https://2130706433/push', 'https://0x7f000001/push'])('blocks unsafe endpoint %s', (endpoint) => {
    expect(() => validatePushSubscription(subscription(endpoint))).toThrow();
  });
  it('requires valid P-256 encryption and auth keys', () => {
    expect(() => validatePushSubscription(subscription())).not.toThrow();
    const bad = subscription();
    bad.keys.p256dh = Buffer.alloc(65).toString('base64url');
    expect(() => validatePushSubscription(bad)).toThrow();
    bad.keys = subscription().keys;
    bad.keys.auth = 'invalid';
    expect(() => validatePushSubscription(bad)).toThrow();
  });
  it('rejects private or mixed DNS answers and failed resolution', async () => {
    mocks.lookup.mockResolvedValueOnce([{ address: '10.0.0.1', family: 4 }]);
    await expect(assertPublicPushDestination('https://push.example.com/id')).rejects.toMatchObject({ statusCode: 400 });
    mocks.lookup.mockResolvedValueOnce([{ address: '8.8.8.8', family: 4 }, { address: '::1', family: 6 }]);
    await expect(assertPublicPushDestination('https://push.example.com/id')).rejects.toMatchObject({ statusCode: 400 });
    mocks.lookup.mockRejectedValueOnce(new Error('unresolvable'));
    await expect(assertPublicPushDestination('https://push.example.com/id')).rejects.toMatchObject({ statusCode: 400 });
  });
  it('rechecks DNS in the connection lookup so a rebinding cannot bypass admission', async () => {
    await expect(assertPublicPushDestination('https://push.example.com/id')).resolves.toBeUndefined();
    mocks.lookup.mockResolvedValueOnce([{ address: '127.0.0.1', family: 4 }]);
    const lookup = publicPushAgent.options.lookup!;
    await new Promise<void>((resolve) => lookup('push.example.com', { all: false }, (error) => { expect(error).toBeInstanceOf(Error); resolve(); }));
  });
});

describe('persistent Push scheduler', () => {
  let service: PushService;
  let state: UserState;
  const user = { id: 'qa-scheduler', stateFileKey: 'qa-scheduler' } as User;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-14T00:00:00Z'));
    state = { revision: 1, bodyMeasurementReminder: { enabled: false, intervalMonths: 1, nextDueAt: '2026-09-14T00:00:01.000Z', lastNotifiedAt: null }, pushSubscriptions: [subscription()], restTimers: [] } as UserState;
    const states = { getOrCreate: async () => structuredClone(state), mutate: async (_user: User, mutate: (draft: UserState) => void) => { mutate(state); state.revision++; return structuredClone(state); } } as UserStateRepository;
    service = new PushService({ vapid: { subject: 'mailto:qa@example.invalid', publicKey: 'isolated', privateKey: 'isolated' } } as AppConfig, states);
  });
  afterEach(() => { service.shutdown(); });
  it('delivers a restored timer through the validated agent and records its outcome', async () => {
    state.restTimers = [{ id: 'timer', dueAt: '2026-09-14T00:00:01.000Z', createdAt: new Date().toISOString(), completedAt: null, title: 'Descanso', body: 'Listo', status: 'scheduled' }];
    await service.restore([user]);
    await vi.advanceTimersByTimeAsync(1100);
    expect(mocks.send).toHaveBeenCalledExactlyOnceWith(expect.anything(), expect.any(String), expect.objectContaining({ agent: publicPushAgent, timeout: 10000 }));
    expect(state.restTimers[0]!.status).toBe('sent');
  });
  it('never sends a cancelled timer and removes expired subscriptions', async () => {
    const cancelled = await service.scheduleRestTimer(user, 1, 'QA', 'QA');
    await service.cancelRestTimer(user, cancelled.id);
    await vi.advanceTimersByTimeAsync(1100);
    expect(mocks.send).not.toHaveBeenCalled();
    mocks.send.mockRejectedValue({ statusCode: 410 });
    await service.scheduleRestTimer(user, 1, 'QA', 'QA');
    await vi.advanceTimersByTimeAsync(1100);
    expect(state.pushSubscriptions).toEqual([]);
    expect(state.restTimers[1]!.status).toBe('failed');
  });
  it('rearms a monthly reminder after an offline snooze replaces state', async () => {
    state.bodyMeasurementReminder.enabled = true;
    await service.restore([user]);
    state.bodyMeasurementReminder.nextDueAt = '2026-09-14T00:00:05.000Z';
    service.reconcile(user, state);
    await vi.advanceTimersByTimeAsync(1100);
    expect(mocks.send).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(4000);
    expect(mocks.send).toHaveBeenCalledOnce();
    expect(state.bodyMeasurementReminder.nextDueAt).toBe('2026-10-14T00:00:05.000Z');
  });
  it('preserves a new measurement schedule saved during a notification delivery', async () => {
    state.bodyMeasurementReminder.enabled = true;
    mocks.send.mockImplementationOnce(async () => { state.bodyMeasurementReminder.nextDueAt = '2026-11-14T00:00:00.000Z'; return { statusCode: 201 }; });
    await service.restore([user]);
    await vi.advanceTimersByTimeAsync(1100);
    expect(state.bodyMeasurementReminder.nextDueAt).toBe('2026-11-14T00:00:00.000Z');
  });
  it('rejects a newly rebound destination before passing it to the transport', async () => {
    await service.scheduleRestTimer(user, 1, 'QA', 'QA');
    mocks.lookup.mockResolvedValue([{ address: '10.0.0.1', family: 4 }]);
    await vi.advanceTimersByTimeAsync(1100);
    expect(mocks.send).not.toHaveBeenCalled();
    expect(state.restTimers[0]!.status).toBe('failed');
  });
  it('detaches only the current device on logout and is safe to retry', async () => {
    state.pushSubscriptions.push({ ...subscription('https://another.example.com/device'), id: 'another' });
    await service.detachDevice(user, 'https://push.example.com/delivery');
    await service.detachDevice(user, 'https://push.example.com/delivery');
    expect(state.pushSubscriptions.map((sub) => sub.id)).toEqual(['another']);
  });
});
