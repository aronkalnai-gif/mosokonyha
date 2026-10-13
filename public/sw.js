// Service worker: shows push notifications sent by the server
// (supabase/functions/send-pushes) and opens the app when one is tapped.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let msg = {};
  try {
    msg = event.data ? event.data.json() : {};
  } catch {
    msg = { body: event.data && event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(msg.title || 'Mosókonyha', {
      body: msg.body || '',
      icon: '/icon-192.png',
      badge: '/badge-96.png',
      tag: msg.tag,
      renotify: !!msg.tag,
      data: { url: msg.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const w of windows) {
        if ('focus' in w) {
          w.navigate(url).catch(() => {});
          return w.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
