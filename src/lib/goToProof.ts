import { router } from 'expo-router';
import { Checkout } from './supabase';

/** Shows the proof screen for the receptionist after a pickup or return. */
export function goToProof(kind: 'pickup' | 'return', row: Checkout) {
  router.replace({
    pathname: '/proof',
    params: {
      kind,
      floor: String(row.floor),
      pickedUpAt: row.picked_up_at,
      returnedAt: row.returned_at ?? '',
      overtime: String(row.overtime_minutes ?? 0),
      fee: String(row.fee_huf ?? 0),
    },
  });
}
