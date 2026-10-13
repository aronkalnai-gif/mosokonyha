import { Settings } from './supabase';

export const MINUTE = 60_000;

/** Key state at time `now`, mirroring public.overtime_fee() in the database. */
export function keyState(pickedUpAt: Date, now: number, s: Settings) {
  const dueAt = new Date(pickedUpAt.getTime() + s.key_minutes * MINUTE);
  const elapsedMs = Math.max(0, now - pickedUpAt.getTime());
  const overMs = Math.max(0, now - dueAt.getTime());
  const feeMinutes = overMs / MINUTE - s.grace_minutes;
  const fee = feeMinutes > 0 ? Math.ceil(feeMinutes / s.fee_block_minutes) * s.fee_huf : 0;
  return {
    dueAt,
    progress: Math.min(1, elapsedMs / (s.key_minutes * MINUTE)),
    remainingMs: Math.max(0, dueAt.getTime() - now),
    overMs,
    overdue: overMs > 0,
    fee,
  };
}

/** 1:05:09 / 05:09 */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatClock(d: Date, seconds = false): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return seconds ? `${hh}:${mm}:${String(d.getSeconds()).padStart(2, '0')}` : `${hh}:${mm}`;
}

export function formatHuf(n: number): string {
  return `${n.toLocaleString('hu-HU')} Ft`;
}
