import { useState } from 'react';
import { useDialog } from '../components/Dialog';
import { ServerError, useLaundry } from '../state/laundry';
import { errorText, T, useI18n } from './i18n';
import { usePushState } from './usePushState';

/** Explains what to do when notifications aren't on. */
export function pushHelp(t: T, state: string | null): string {
  if (state === 'ios-install') return t('pushIosText');
  if (state === 'denied') return t('pushDenied');
  if (state === 'unsupported') return t('pushUnsupported');
  return '';
}

/** "Notify me when this floor's key is free", turning notifications on first if needed. */
export function useWatch(floor: number) {
  const { t } = useI18n();
  const { watches, toggleWatch } = useLaundry();
  const dialog = useDialog();
  const push = usePushState();
  const [busy, setBusy] = useState(false);
  const watching = watches.has(floor);

  const toggle = async () => {
    // Without notifications there is no way to tell you, so turn them on first.
    if (!watching && push.state !== 'on') {
      const state = await push.enable();
      if (state !== 'on') return dialog.alert(t('notifyMe'), `${t('pushNeeded')}\n\n${pushHelp(t, state)}`);
    }
    setBusy(true);
    try {
      await toggleWatch(floor);
    } catch (e) {
      dialog.alert(errorText(t, e instanceof ServerError ? e.code : String(e)));
    } finally {
      setBusy(false);
    }
  };

  return { watching, busy, toggle };
}
