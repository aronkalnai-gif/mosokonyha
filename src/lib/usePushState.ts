import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { enablePush, getPushState, PushState } from './push';

export function usePushState() {
  const [state, setState] = useState<PushState | null>(null);
  const refresh = useCallback(() => getPushState().then(setState), []);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);

  const enable = useCallback(async () => {
    const next = await enablePush().catch((e) => {
      console.warn('Push', e);
      return 'off' as const;
    });
    setState(next);
    return next;
  }, []);

  return { state, enable };
}
