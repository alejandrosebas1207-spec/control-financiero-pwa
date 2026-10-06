const CACHE_NAME = 'lifeos-pwa-v70';
const CORE_ASSETS = [
  './',
  './index.html',
  './assets/app.js',
  './assets/app.css',
  './icons/brands/guayaquil.svg',
  './icons/brands/deuna.svg',
  './icons/brands/mastercard.svg',
  './icons/brands/cash.svg',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon.png',
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600;700&display=swap'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CORE_ASSETS).catch(err => {
        console.warn('Pre-cache warning:', err);
      });
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(k => {
          if (k !== CACHE_NAME) {
            return caches.delete(k);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || event.request.url.includes('supabase.co')) {
    return;
  }

  // HTML Navigation: Network-First with 1.2s Timeout and solid Cache Fallback
  if (event.request.mode === 'navigate' || (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      new Promise(resolve => {
        const timeoutId = setTimeout(async () => {
          const cached = await caches.match('./index.html') || await caches.match('./');
          if (cached) resolve(cached);
        }, 1200);

        fetch(event.request)
          .then(networkRes => {
            clearTimeout(timeoutId);
            if (networkRes && networkRes.status === 200) {
              const copy = networkRes.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
            }
            resolve(networkRes);
          })
          .catch(async () => {
            clearTimeout(timeoutId);
            const cached = await caches.match(event.request) || await caches.match('./index.html') || await caches.match('./');
            resolve(cached || new Response('Offline', { status: 200, headers: { 'Content-Type': 'text/plain' } }));
          });
      })
    );
    return;
  }

  // Static Assets: Stale-While-Revalidate with ignoreSearch
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
