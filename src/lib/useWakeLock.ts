import { useEffect } from 'react';

/** Keeps the screen on while mounted, where the browser allows it. */
export function useWakeLock() {
  useEffect(() => {
    const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { wakeLock?: WakeLock }) : undefined;
    if (!nav?.wakeLock) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    nav.wakeLock
      .request('screen')
      .then((l) => {
        if (cancelled) l.release().catch(() => {});
        else lock = l;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      lock?.release().catch(() => {});
    };
  }, []);
}
