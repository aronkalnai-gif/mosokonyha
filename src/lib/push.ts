// Web Push: lets the server notify this browser (key time reminders, machine
// finished, key free). Messages are shown by public/sw.js.
import { supabase } from './supabase';

export type PushState =
  | 'on'
  | 'off' // supported, not enabled yet
  | 'denied' // blocked in the browser settings
  | 'ios-install' // iPhone/iPad: only works after "Add to Home Screen"
  | 'unsupported';

const VAPID_PUBLIC_KEY = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY ?? '';

const hasWindow = typeof window !== 'undefined' && typeof navigator !== 'undefined';

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isStandalone(): boolean {
  return (
    hasWindow &&
    (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true)
  );
}

function supported(): boolean {
  return hasWindow && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && !!VAPID_PUBLIC_KEY;
}

export function registerServiceWorker() {
  if (hasWindow && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch((e) => console.warn('Service worker', e));
  }
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

export async function getPushState(): Promise<PushState> {
  if (!supported()) return hasWindow && isIos() && !isStandalone() ? 'ios-install' : 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission !== 'granted') return 'off';
  return (await currentSubscription()) ? 'on' : 'off';
}

async function save(sub: PushSubscription) {
  const json = sub.toJSON();
  const { error } = await supabase.rpc('save_push_subscription', {
    p_endpoint: json.endpoint,
    p_p256dh: json.keys?.p256dh,
    p_auth: json.keys?.auth,
  });
  if (error) throw error;
}

function base64UrlToBytes(s: string): Uint8Array<ArrayBuffer> {
  const b64 = (s + '='.repeat((4 - (s.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Call from a button press: browsers only show the permission prompt then. */
export async function enablePush(): Promise<PushState> {
  if (!supported()) return getPushState();
  // Ask first, before awaiting anything else, so Safari still sees the tap.
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off';

  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(VAPID_PUBLIC_KEY) }));
  await save(sub);
  return 'on';
}

/** After signing in: make sure this browser's subscription belongs to the signed-in user. */
export async function resyncPush() {
  if (!supported() || Notification.permission !== 'granted') return;
  const sub = await currentSubscription();
  if (sub) await save(sub);
}

/** Before signing out: stop notifications for this account in this browser. */
export async function forgetThisBrowser() {
  if (!supported()) return;
  const sub = await currentSubscription();
  if (!sub) return;
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe();
}
