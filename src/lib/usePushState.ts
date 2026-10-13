import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../state/auth';
import { enablePush, getPushState, PushState } from './push';

export function usePushState() {
  const { ensureSession } = useAuth();
  const [state, setState] = useState<PushState | null>(null);
  const refresh = useCallback(() => getPushState().then(setState), []);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);

  const enable = useCallback(async () => {
    // The subscription is saved to an account, so make sure there is one.
    const next = await enablePush(ensureSession).catch((e) => {
      console.warn('Push', e);
      return 'off' as const;
    });
    setState(next);
    return next;
  }, [ensureSession]);

  return { state, enable };
}
