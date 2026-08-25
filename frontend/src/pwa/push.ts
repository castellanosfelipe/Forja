import type { BodyMeasurementReminder, RestTimerRecord } from '../types/state';
import { api } from '../api/client';

export const pushApi = {
  async enable(): Promise<void> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      throw new Error('Este dispositivo no puede mostrar avisos cuando FORJA está cerrado.');
    }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') throw new Error('Los avisos están bloqueados. Permítelos en la configuración y vuelve a intentarlo.');
    const registration = await navigator.serviceWorker.ready;
    const { publicKey } = await api<{ publicKey: string }>('/api/push/vapid-public-key');
    const existing = await registration.pushManager.getSubscription();
    const subscription = existing ?? await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToBytes(publicKey),
    });
    await api('/api/push/subscriptions', { method: 'POST', json: subscription.toJSON() });
  },

  scheduleTimer(durationSeconds: number) {
    return api<RestTimerRecord>('/api/push/rest-timers', {
      method: 'POST',
      json: { durationSeconds, title: 'Descanso terminado', body: 'Tu siguiente serie te espera.' },
    });
  },

  cancelTimer(timerId: string) {
    return api<void>(`/api/push/rest-timers/${encodeURIComponent(timerId)}`, { method: 'DELETE' });
  },

  syncMeasurementReminder() {
    return api<BodyMeasurementReminder>('/api/push/body-measurement-reminder/sync', {
      method: 'POST',
      json: {},
    });
  },
};

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replaceAll('-', '+').replaceAll('_', '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
  return bytes;
}
