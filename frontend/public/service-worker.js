const SHELL_CACHE = 'forja-shell-v4';
const MEDIA_CACHE = 'forja-exercise-media-v1';
const ACTIVE_CACHES = new Set([SHELL_CACHE, MEDIA_CACHE]);
const SHELL = self.__FORJA_PRECACHE || ['/', '/manifest.webmanifest'];
const offlineFallback = () => new Response('No hay conexión. Abre FORJA con conexión una vez para guardar lo necesario.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL)));
  // Keep the active version and its lazy chunks until its tabs have closed.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('forja-') && !ACTIVE_CACHES.has(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response.ok && !response.redirected && response.headers.get('Content-Type')?.includes('text/html')) {
            const cache = await caches.open(SHELL_CACHE);
            await cache.put('/', response.clone()).catch(() => undefined);
            return response;
          }
          return response.ok ? response : (await caches.match('/')) || response;
        })
        .catch(async () => (await caches.match('/')) || offlineFallback()),
    );
    return;
  }

  if (url.pathname.startsWith('/exercise-media/')) {
    event.respondWith(
      caches.open(MEDIA_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        try {
          const response = await fetch(request, { cache: 'no-cache' });
          if (response.ok) await cache.put(request, response.clone()).catch(() => undefined);
          if (response.status >= 500 && cached) return cached;
          return response;
        } catch (error) {
          if (cached) return cached;
          throw error;
        }
      }),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then(async (response) => {
      if (response.ok && ['script', 'style', 'font', 'image'].includes(request.destination)) {
        const cache = await caches.open(SHELL_CACHE);
        await cache.put(request, response.clone()).catch(() => undefined);
      }
      return response;
    })),
  );
});

self.addEventListener('push', (event) => {
  const payload = event.data?.json() ?? {};
  event.waitUntil(self.registration.showNotification(payload.title ?? 'FORJA', {
    body: payload.body ?? 'Tu descanso ha terminado.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: payload.timerId ? `rest-${payload.timerId}` : payload.type === 'body-measurement-reminder' ? 'body-measurement' : 'forja',
    renotify: true,
    data: { url: payload.url ?? '/workout' },
    vibrate: [180, 80, 180],
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const requestedUrl = new URL(event.notification.data?.url ?? '/workout', self.location.origin);
  const targetUrl = requestedUrl.origin === self.location.origin ? requestedUrl.href : new URL('/workout', self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    const existing = clients.find((client) => client.url.startsWith(self.location.origin));
    if (existing) {
      existing.navigate(targetUrl);
      return existing.focus();
    }
    return self.clients.openWindow(targetUrl);
  }));
});
