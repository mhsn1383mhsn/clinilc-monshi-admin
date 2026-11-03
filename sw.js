/* ============================================================================
   سرویس‌ورکر هر برنامه (همان فایل، در پوشهٔ هر برنامه کپی می‌شود)
   — پوستهٔ خودِ برنامه را کش می‌کند تا بدون اینترنت هم باز شود
   — برای درخواست‌های صفحه از شبکه اول استفاده می‌کند و اگر شبکه نبود، نسخهٔ کش
   — اعلان‌های پوش (در صورت تنظیم PUSH_API_URL در config) را نمایش می‌دهد
   ========================================================================= */
const CACHE = "clinic-app-v5-ui";
const SHELL = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put('./index.html', copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match('./index.html').then((hit) => hit || caches.match('./')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((hit) => hit || fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
      }
      return response;
    }))
  );
});

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (_) { data = { message: event.data ? event.data.text() : '' }; }
  event.waitUntil(self.registration.showNotification(data.title || 'اعلان کلینیک', {
    body: data.message || 'یک اعلان تازه ثبت شده است.',
    tag: data.key || 'clinic-notification',
    data: { url: data.url || './index.html' },
    dir: 'rtl',
    lang: 'fa',
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  let target;
  try {
    target = new URL((event.notification.data && event.notification.data.url) || './index.html', self.location.href);
    if (target.origin !== self.location.origin) target = new URL('./index.html', self.location.href);
  } catch (_) {
    target = new URL('./index.html', self.location.href);
  }
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const client of list) {
      if (new URL(client.url).origin === self.location.origin) {
        client.focus();
        return client.navigate(target.href);
      }
    }
    return clients.openWindow(target.href);
  }));
});
