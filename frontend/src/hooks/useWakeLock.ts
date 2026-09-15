import { useEffect, useState } from 'react';

export function useWakeLock(enabled: boolean) {
  const [active, setActive] = useState(false);
  const [supported] = useState(() => 'wakeLock' in navigator);

  useEffect(() => {
    if (!enabled || !supported) return;
    let sentinel: WakeLockSentinel | null = null;
    let disposed = false;
    let acquiring = false;

    const release = (lock: WakeLockSentinel) => {
      if (!lock.released) void lock.release().catch(() => undefined);
    };

    const acquire = async () => {
      if (document.visibilityState !== 'visible' || disposed || acquiring || (sentinel && !sentinel.released)) return;
      acquiring = true;
      try {
        const requestedSentinel = await navigator.wakeLock.request('screen');
        if (disposed || document.visibilityState !== 'visible') {
          release(requestedSentinel);
          return;
        }
        sentinel = requestedSentinel;
        setActive(true);
        requestedSentinel.addEventListener('release', () => {
          if (sentinel === requestedSentinel) sentinel = null;
          if (!disposed) setActive(false);
        }, { once: true });
      } catch {
        sentinel = null;
        if (!disposed) setActive(false);
      } finally {
        acquiring = false;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !sentinel) void acquire();
    };
    void acquire();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', onVisibility);
      if (sentinel) release(sentinel);
      sentinel = null;
      setActive(false);
    };
  }, [enabled, supported]);

  return { supported, active };
}
