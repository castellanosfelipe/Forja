import { useEffect, useState } from 'react';

export function useWakeLock(enabled: boolean) {
  const [active, setActive] = useState(false);
  const [supported] = useState(() => 'wakeLock' in navigator);

  useEffect(() => {
    if (!enabled || !supported) return;
    let sentinel: WakeLockSentinel | null = null;
    let disposed = false;

    const acquire = async () => {
      if (document.visibilityState !== 'visible' || disposed || (sentinel && !sentinel.released)) return;
      try {
        const requestedSentinel = await navigator.wakeLock.request('screen');
        if (disposed) {
          if (!requestedSentinel.released) void requestedSentinel.release();
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
        setActive(false);
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
      if (sentinel && !sentinel.released) void sentinel.release();
      sentinel = null;
      setActive(false);
    };
  }, [enabled, supported]);

  return { supported, active };
}
