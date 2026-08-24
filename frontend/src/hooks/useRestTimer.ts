import { useCallback, useEffect, useRef, useState } from 'react';
import { pushApi } from '../pwa/push';

export function useRestTimer(webPushEnabled = true) {
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const deadline = useRef(0);
  const remoteTimerId = useRef<string | null>(null);

  const cancel = useCallback(async () => {
    setRunning(false);
    setRemaining(0);
    if (remoteTimerId.current) {
      const id = remoteTimerId.current;
      remoteTimerId.current = null;
      await pushApi.cancelTimer(id).catch(() => undefined);
    }
  }, []);

  const start = useCallback(async (seconds: number) => {
    if (remoteTimerId.current) await cancel();
    deadline.current = Date.now() + seconds * 1_000;
    setRemaining(seconds);
    setRunning(true);
    if (webPushEnabled && 'Notification' in window && (document.visibilityState === 'hidden' || Notification.permission === 'granted')) {
      const timer = await pushApi.scheduleTimer(seconds).catch(() => null);
      remoteTimerId.current = timer?.id ?? null;
    }
  }, [cancel, webPushEnabled]);

  const add = useCallback((seconds: number) => {
    deadline.current += seconds * 1_000;
    setRemaining((current) => Math.max(0, current + seconds));
  }, []);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const value = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1_000));
      setRemaining(value);
      if (value === 0) {
        setRunning(false);
        remoteTimerId.current = null;
        if (navigator.vibrate) navigator.vibrate([180, 80, 180]);
      }
    };
    const interval = window.setInterval(tick, 250);
    tick();
    return () => window.clearInterval(interval);
  }, [running]);

  return { remaining, running, start, cancel, add };
}
