// If the reception QR link is opened before signing in, its code is kept here
// so we can continue at the reception page after login.
const KEY = 'pendingQr';
const storage = () => (typeof sessionStorage !== 'undefined' ? sessionStorage : null);

/** Call once at startup. */
export function rememberQrFromUrl() {
  if (typeof window === 'undefined' || window.location.pathname !== '/qr') return;
  const c = new URLSearchParams(window.location.search).get('c');
  if (c) storage()?.setItem(KEY, c);
}

export const hasPendingQr = () => !!storage()?.getItem(KEY);

export function takePendingQr(): string | null {
  const c = storage()?.getItem(KEY) ?? null;
  storage()?.removeItem(KEY);
  return c;
}
