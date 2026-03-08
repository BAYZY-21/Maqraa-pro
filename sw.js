// ══════════════════════════════════════
// مقرأة بيجي - Service Worker v5
// ══════════════════════════════════════
const CACHE_NAME = 'beeji-v5';
const BASE = '/Ha/';
const ASSETS = [BASE, BASE+'index.html', BASE+'manifest.json', BASE+'icon-192.png', BASE+'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)).catch(()=>{}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))
  );
  self.clients.claim();
});

// تحديث عند أمر التطبيق
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// ── إشعارات Push من التطبيق (Notification API via SW)
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || BASE + 'index.html';
  if (e.action === 'dismiss') return;
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes('/Ha/') && 'focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  if (!url.startsWith('http') || url.includes('firestore') || url.includes('firebase') || url.includes('googleapis')) return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp && resp.status === 200 && e.request.destination === 'document') {
          caches.open(CACHE_NAME).then(c => c.put(e.request, resp.clone()));
        }
        return resp;
      }).catch(() => caches.match(BASE + 'index.html'));
    })
  );
});
