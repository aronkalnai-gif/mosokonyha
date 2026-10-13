import { router } from 'expo-router';
import { useCallback } from 'react';
import { useDialog } from '../components/Dialog';
import { useI18n } from './i18n';
import { Checkout } from './supabase';
import { formatHuf } from './time';

/**
 * Where to go after scanning the reception QR code: to the laundry room after a
 * pickup, back to the key list after a return (with the fee, if any).
 */
export function useAfterKeyChange() {
  const { t } = useI18n();
  const dialog = useDialog();

  return useCallback(
    (kind: 'pickup' | 'return', row: Checkout) => {
      if (kind === 'pickup') {
        router.replace('/room');
        return;
      }
      router.dismissTo('/');
      const fee = row.fee_huf ?? 0;
      dialog.alert(
        t('keyReturned', { floor: row.floor }),
        fee > 0
          ? t('returnedWithFee', { min: row.overtime_minutes ?? 0, fee: formatHuf(fee) })
          : t('returnedOnTime'),
      );
    },
    [t, dialog],
  );
}
