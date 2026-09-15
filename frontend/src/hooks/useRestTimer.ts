import { useCallback, useEffect, useRef, useState } from 'react';
import { pushApi } from '../pwa/push';

export function useRestTimer(webPushEnabled = true) {
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const deadline = useRef(0);
  const remoteTimerId = useRef<string | null>(null);
  const operation = useRef(0);
  const active = useRef(false);
  const mounted = useRef(true);

  const removeRemote = useCallback(async (id: string) => {
    try { await pushApi.cancelTimer(id); }
    catch { if (mounted.current) setNotificationError('No pudimos cancelar el aviso anterior. Podría llegar aunque hayas cambiado el descanso.'); }
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      active.current = false;
      operation.current += 1;
      const previous = remoteTimerId.current;
      remoteTimerId.current = null;
      if (previous) void removeRemote(previous);
    };
  }, [removeRemote]);

  const scheduleRemote = useCallback(async (ticket: number) => {
    const previous = remoteTimerId.current;
    remoteTimerId.current = null;
    if (previous) await removeRemote(previous);
    if (ticket !== operation.current || !active.current || !webPushEnabled || !('Notification' in window) || Notification.permission !== 'granted') return;
    const seconds = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1_000));
    if (seconds === 0) return;
    try {
      const timer = await pushApi.scheduleTimer(seconds);
      if (ticket !== operation.current || !active.current) { await removeRemote(timer.id); return; }
      remoteTimerId.current = timer.id;
    } catch {
      if (mounted.current && ticket === operation.current) setNotificationError('El descanso sigue en pantalla, pero no pudimos preparar su aviso. Mantén FORJA abierto para verlo.');
    }
  }, [removeRemote, webPushEnabled]);

  const cancel = useCallback(async () => {
    operation.current += 1;
    active.current = false;
    setRunning(false);
    setRemaining(0);
    setNotificationError(null);
    const previous = remoteTimerId.current;
    remoteTimerId.current = null;
    if (previous) await removeRemote(previous);
  }, [removeRemote]);

  const start = useCallback(async (seconds: number) => {
    if (!Number.isFinite(seconds)) return;
    const duration = Math.max(1, Math.min(86_400, Math.round(seconds)));
    deadline.current = Date.now() + duration * 1_000;
    active.current = true;
    setRemaining(duration);
    setRunning(true);
    setNotificationError(null);
    await scheduleRemote(++operation.current);
  }, [scheduleRemote]);

  const add = useCallback((seconds: number) => {
    if (!active.current || !Number.isFinite(seconds)) return;
    deadline.current = Math.min(Date.now() + 86_400_000, Math.max(Date.now(), deadline.current + Math.round(seconds) * 1_000));
    setRemaining(Math.max(0, Math.ceil((deadline.current - Date.now()) / 1_000)));
    setNotificationError(null);
    void scheduleRemote(++operation.current);
  }, [scheduleRemote]);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const value = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1_000));
      setRemaining(value);
      if (value === 0) {
        active.current = false;
        operation.current += 1;
        setRunning(false);
        remoteTimerId.current = null;
        if (navigator.vibrate) navigator.vibrate([180, 80, 180]);
      }
    };
    const interval = window.setInterval(tick, 250);
    tick();
    return () => window.clearInterval(interval);
  }, [running]);

  return { remaining, running, notificationError, start, cancel, add };
}
