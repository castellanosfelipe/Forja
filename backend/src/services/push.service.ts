import { randomUUID } from 'node:crypto';
import { Client, Receiver } from '@upstash/qstash';
import webPush, { type PushSubscription } from 'web-push';
import type { AppConfig } from '../config/env.js';
import type { BodyMeasurementReminder, PushSubscriptionRecord, RestTimerRecord, User, UserState } from '../domain/models.js';
import { badRequest, notFound, serviceUnavailable } from '../http/errors.js';
import { assertPublicPushDestination, publicPushAgent, validatePushSubscription } from '../utils/push-validation.js';
import type { AccountRepository, StateRepository } from '../repositories/contracts.js';

export class PushService {
  private readonly handles = new Map<string, NodeJS.Timeout>();
  private readonly enabled: boolean;
  private readonly qstash: Client | null;
  private readonly qstashReceiver: Receiver | null;

  public constructor(
    private readonly config: AppConfig,
    private readonly states: StateRepository,
    private readonly accounts?: AccountRepository,
  ) {
    this.enabled = Boolean(config.vapid.subject && config.vapid.publicKey && config.vapid.privateKey);
    if (this.enabled) {
      webPush.setVapidDetails(config.vapid.subject!, config.vapid.publicKey!, config.vapid.privateKey!);
    }
    this.qstash = config.qstash?.token
      ? new Client({ token: config.qstash.token, enableTelemetry: false })
      : null;
    this.qstashReceiver = config.qstash?.currentSigningKey && config.qstash.nextSigningKey
      ? new Receiver({
          currentSigningKey: config.qstash.currentSigningKey,
          nextSigningKey: config.qstash.nextSigningKey,
        })
      : null;
  }

  public publicKey(): string {
    if (!this.enabled) throw serviceUnavailable('Web Push is not configured');
    return this.config.vapid.publicKey!;
  }

  public async subscribe(user: User, input: unknown): Promise<PushSubscriptionRecord> {
    this.publicKey();
    validatePushSubscription(input);
    const value = input;
    await assertPublicPushDestination(value.endpoint);
    const now = new Date().toISOString();
    let result!: PushSubscriptionRecord;
    await this.states.mutate(user, (state) => {
      const existing = state.pushSubscriptions.find((subscription) => subscription.endpoint === value.endpoint);
      if (existing) {
        existing.expirationTime = value.expirationTime ?? null;
        existing.keys = { p256dh: value.keys!.p256dh, auth: value.keys!.auth };
        existing.updatedAt = now;
        result = structuredClone(existing);
        return;
      }
      result = {
        id: randomUUID(),
        endpoint: value.endpoint!,
        expirationTime: value.expirationTime ?? null,
        keys: { p256dh: value.keys!.p256dh, auth: value.keys!.auth },
        createdAt: now,
        updatedAt: now,
      };
      state.pushSubscriptions.push(result);
    });
    await this.syncMeasurementReminder(user);
    return result;
  }

  public async unsubscribe(user: User, subscriptionId: string): Promise<void> {
    await this.states.mutate(user, (state) => {
      const index = state.pushSubscriptions.findIndex((subscription) => subscription.id === subscriptionId);
      if (index === -1) throw notFound('Push subscription not found');
      state.pushSubscriptions.splice(index, 1);
    });
    await this.syncMeasurementReminder(user);
  }

  public async detachDevice(user: User, endpoint: string): Promise<void> {
    const state = await this.states.getOrCreate(user);
    if (!state.pushSubscriptions.some((subscription) => subscription.endpoint === endpoint)) return;
    const latest = await this.states.mutate(user, (draft) => {
      draft.pushSubscriptions = draft.pushSubscriptions.filter((subscription) => subscription.endpoint !== endpoint);
    });
    this.armMeasurementReminder(user, latest);
  }

  public async scheduleRestTimer(
    user: User,
    durationSeconds: number,
    title: string,
    body: string,
  ): Promise<RestTimerRecord> {
    this.publicKey();
    if (!Number.isInteger(durationSeconds) || durationSeconds < 1 || durationSeconds > 86_400) {
      throw badRequest('durationSeconds must be an integer between 1 and 86400');
    }
    const current = await this.states.getOrCreate(user);
    if (current.pushSubscriptions.length === 0) {
      throw badRequest('At least one Push subscription is required');
    }
    const createdAt = new Date();
    const record: RestTimerRecord = {
      id: randomUUID(),
      dueAt: new Date(createdAt.valueOf() + durationSeconds * 1_000).toISOString(),
      title: title.slice(0, 100),
      body: body.slice(0, 240),
      status: 'scheduled',
      createdAt: createdAt.toISOString(),
      completedAt: null,
    };
    await this.states.mutate(user, (state) => {
      state.restTimers.push(record);
    });
    if (this.config.serverless) {
      try {
        await this.scheduleDurableDelivery(user, record);
      } catch (error) {
        await this.states.mutate(user, (state) => {
          const timer = state.restTimers.find((candidate) => candidate.id === record.id);
          if (timer?.status === 'scheduled') {
            timer.status = 'failed';
            timer.completedAt = new Date().toISOString();
          }
        });
        this.logTaskError(user, 'qstash-schedule', error);
        throw serviceUnavailable('No pudimos programar la notificación de descanso. Inténtalo nuevamente.');
      }
    } else {
      this.arm(user, record);
    }
    return record;
  }

  public async cancelRestTimer(user: User, timerId: string): Promise<void> {
    const key = this.timerKey(user.id, timerId);
    const handle = this.handles.get(key);
    if (handle) clearTimeout(handle);
    this.handles.delete(key);
    await this.states.mutate(user, (state) => {
      const timer = state.restTimers.find((candidate) => candidate.id === timerId);
      if (!timer) throw notFound('Rest timer not found');
      if (timer.status === 'scheduled') {
        timer.status = 'cancelled';
        timer.completedAt = new Date().toISOString();
      }
    });
  }

  public async restore(users: User[]): Promise<void> {
    if (!this.enabled || this.config.serverless) return;
    for (const user of users) {
      try {
      const state = await this.states.getOrCreate(user);
      for (const timer of state.restTimers.filter((candidate) => candidate.status === 'scheduled')) {
        this.arm(user, timer);
      }
      this.armMeasurementReminder(user, state);
      } catch(error) { this.logTaskError(user, 'restore', error); }
    }
  }

  public async syncMeasurementReminder(user: User): Promise<BodyMeasurementReminder> {
    const state = await this.states.getOrCreate(user);
    this.armMeasurementReminder(user, state);
    return structuredClone(state.bodyMeasurementReminder);
  }

  public reconcile(user: User, state: UserState): void {
    this.armMeasurementReminder(user, state);
  }

  public async handleDurableDelivery(rawBody: string, signature: string | undefined): Promise<void> {
    if (!this.qstashReceiver || !signature) throw notFound('Notification delivery endpoint not found');
    const verified = await this.qstashReceiver.verify({
      signature,
      body: rawBody,
      url: `${this.publicAppUrl()}/api/internal/qstash`,
      clockTolerance: 5,
    }).catch(() => false);
    if (!verified) throw notFound('Notification delivery endpoint not found');
    let payload: unknown;
    try { payload = JSON.parse(rawBody) as unknown; }
    catch { throw badRequest('Invalid delivery payload'); }
    if (!payload || typeof payload !== 'object') throw badRequest('Invalid delivery payload');
    const value = payload as Record<string, unknown>;
    if (value.kind !== 'rest-timer' || typeof value.userId !== 'string' || typeof value.timerId !== 'string') {
      throw badRequest('Invalid delivery payload');
    }
    if (!this.accounts) throw serviceUnavailable('Notification account storage is not configured');
    const user = await this.accounts.findUserById(value.userId);
    if (!user) return;
    await this.deliver(user, value.timerId);
  }

  public async processDueNotifications(): Promise<{ timers: number; measurements: number }> {
    if (!this.accounts) throw serviceUnavailable('Notification account storage is not configured');
    const snapshot = await this.accounts.snapshot();
    let timers = 0;
    let measurements = 0;
    for (const user of snapshot.users) {
      try {
        const state = await this.states.getOrCreate(user);
        for (const timer of state.restTimers) {
          if (timer.status === 'scheduled' && Date.parse(timer.dueAt) <= Date.now()) {
            await this.deliver(user, timer.id);
            timers += 1;
          }
        }
        if (state.bodyMeasurementReminder.enabled && state.pushSubscriptions.length > 0 &&
            Date.parse(state.bodyMeasurementReminder.nextDueAt) <= Date.now()) {
          await this.deliverMeasurementReminder(user);
          measurements += 1;
        }
      } catch (error) {
        this.logTaskError(user, 'scheduled-notifications', error);
      }
    }
    return { timers, measurements };
  }

  private logTaskError(user: User, task: string, error: unknown): void {
    console.error(JSON.stringify({level:'error',event:'push_task_failed',userId:user.id,task,message:error instanceof Error?error.message:'unknown error'}));
  }

  public shutdown(): void {
    for (const handle of this.handles.values()) clearTimeout(handle);
    this.handles.clear();
  }

  private arm(user: User, timer: RestTimerRecord): void {
    if (this.config.serverless) return;
    const key = this.timerKey(user.id, timer.id);
    const existing = this.handles.get(key);
    if (existing) clearTimeout(existing);
    const delay = Math.max(0, Math.min(Date.parse(timer.dueAt) - Date.now(), 2_147_000_000));
    this.handles.set(key, setTimeout(() => {
      this.handles.delete(key);
      if (Date.parse(timer.dueAt) > Date.now() + 1_000) {
        this.arm(user, timer);
      } else {
        void this.deliver(user, timer.id).catch(error=>this.logTaskError(user, timer.id, error));
      }
    }, delay));
  }

  private armMeasurementReminder(user: User, state: UserState): void {
    if (this.config.serverless) return;
    const key = this.measurementKey(user.id);
    const existing = this.handles.get(key);
    if (existing) clearTimeout(existing);
    this.handles.delete(key);
    const reminder = state.bodyMeasurementReminder;
    if (!this.enabled || !reminder.enabled || state.pushSubscriptions.length === 0) return;
    const delay = Math.max(0, Math.min(Date.parse(reminder.nextDueAt) - Date.now(), 2_147_000_000));
    this.handles.set(key, setTimeout(() => {
      this.handles.delete(key);
      if (Date.parse(reminder.nextDueAt) > Date.now() + 1_000) {
        void this.syncMeasurementReminder(user).catch(error=>this.logTaskError(user,'measurement-reschedule',error));
      } else {
        void this.deliverMeasurementReminder(user).catch(error=>this.logTaskError(user,'measurement-delivery',error));
      }
    }, delay));
  }

  private async deliver(user: User, timerId: string): Promise<void> {
    const state = await this.states.getOrCreate(user);
    const timer = state.restTimers.find((candidate) => candidate.id === timerId);
    if (!timer || timer.status !== 'scheduled') return;
    const expiredIds: string[] = [];
    let successful = 0;
    const payload = JSON.stringify({
      type: 'rest-timer',
      timerId,
      title: timer.title,
      body: timer.body,
      url: '/workout',
    });
    await Promise.all(state.pushSubscriptions.map(async (subscription) => {
      try {
        validatePushSubscription(subscription);
        await assertPublicPushDestination(subscription.endpoint);
        await webPush.sendNotification(this.toWebPushSubscription(subscription), payload, {
          TTL: 60 * 10,
          urgency: 'high',
          agent: publicPushAgent,
          timeout: 10_000,
        });
        successful += 1;
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) expiredIds.push(subscription.id);
      }
    }));
    await this.states.mutate(user, (latest) => {
      latest.pushSubscriptions = latest.pushSubscriptions.filter(
        (subscription) => !expiredIds.includes(subscription.id),
      );
      const latestTimer = latest.restTimers.find((candidate) => candidate.id === timerId);
      if (latestTimer?.status === 'scheduled') {
        latestTimer.status = successful > 0 ? 'sent' : 'failed';
        latestTimer.completedAt = new Date().toISOString();
      }
    });
  }

  private async deliverMeasurementReminder(user: User): Promise<void> {
    const state = await this.states.getOrCreate(user);
    const reminder = state.bodyMeasurementReminder;
    if (!reminder.enabled || state.pushSubscriptions.length === 0) return;
    if(Date.parse(reminder.nextDueAt)>Date.now()){this.armMeasurementReminder(user,state);return;}
    const expiredIds: string[] = [];
    let successful = 0;
    const payload = JSON.stringify({
      type: 'body-measurement-reminder',
      title: 'Momento de medir tus perímetros',
      body: 'Registra cuello, cintura y cadera para actualizar tu estimación de grasa corporal.',
      url: '/metrics',
    });
    await Promise.all(state.pushSubscriptions.map(async (subscription) => {
      try {
        validatePushSubscription(subscription);
        await assertPublicPushDestination(subscription.endpoint);
        await webPush.sendNotification(this.toWebPushSubscription(subscription), payload, {
          TTL: 60 * 60 * 24 * 7,
          urgency: 'normal',
          agent: publicPushAgent,
          timeout: 10_000,
        });
        successful += 1;
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) expiredIds.push(subscription.id);
      }
    }));
    await this.states.mutate(user, (latest) => {
      latest.pushSubscriptions = latest.pushSubscriptions.filter(
        (subscription) => !expiredIds.includes(subscription.id),
      );
      // A measurement or snooze saved while delivery was in flight wins over
      // the schedule snapshot used for this notification.
      if (!latest.bodyMeasurementReminder.enabled || latest.bodyMeasurementReminder.nextDueAt !== reminder.nextDueAt) return;
      if (successful > 0) {
        latest.bodyMeasurementReminder.lastNotifiedAt = new Date().toISOString();
        latest.bodyMeasurementReminder.nextDueAt = addOneMonth(new Date());
      } else if (latest.pushSubscriptions.length > 0) {
        latest.bodyMeasurementReminder.nextDueAt = new Date(Date.now() + 6 * 60 * 60 * 1_000).toISOString();
      }
    });
    await this.syncMeasurementReminder(user);
  }

  private async scheduleDurableDelivery(user: User, timer: RestTimerRecord): Promise<void> {
    if (!this.qstash) throw serviceUnavailable('El programador de notificaciones no está configurado');
    await this.qstash.publishJSON({
      url: `${this.publicAppUrl()}/api/internal/qstash`,
      body: { kind: 'rest-timer', userId: user.id, timerId: timer.id },
      notBefore: Math.floor(Date.parse(timer.dueAt) / 1_000),
      deduplicationId: `forja-rest-${timer.id}`,
      retries: 4,
      timeout: 15,
      label: 'forja-rest-timer',
    });
  }

  private publicAppUrl(): string {
    return this.config.publicAppUrl ?? this.config.expectedOrigins?.[0] ?? 'http://localhost:8080';
  }

  private toWebPushSubscription(record: PushSubscriptionRecord): PushSubscription {
    return {
      endpoint: record.endpoint,
      expirationTime: record.expirationTime,
      keys: record.keys,
    };
  }

  private timerKey(userId: string, timerId: string): string {
    return `${userId}:${timerId}`;
  }

  private measurementKey(userId: string): string {
    return `${userId}:body-measurement`;
  }
}

function addOneMonth(value: Date): string {
  const date = new Date(value);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + 1);
  const daysInTargetMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, daysInTargetMonth));
  return date.toISOString();
}
