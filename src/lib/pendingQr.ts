// The code from the reception QR code, kept until it's used: first to join
// (with a name), then on the reception page to pick up or return a key.
const KEY = 'pendingQr';
const storage = () => (typeof sessionStorage !== 'undefined' ? sessionStorage : null);

/** Call once at startup. */
export function rememberQrFromUrl() {
  if (typeof window === 'undefined' || window.location.pathname !== '/qr') return;
  const c = new URLSearchParams(window.location.search).get('c');
  if (c) storage()?.setItem(KEY, c);
}

export const hasPendingQr = () => !!storage()?.getItem(KEY);
export const peekPendingQr = () => storage()?.getItem(KEY) ?? null;
export const setPendingQr = (code: string) => storage()?.setItem(KEY, code);

export function takePendingQr(): string | null {
  const c = storage()?.getItem(KEY) ?? null;
  storage()?.removeItem(KEY);
  return c;
}
