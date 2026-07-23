/*
 * Hand-written service worker.
 *
 * No Workbox: the caching needed here is a few dozen lines, and a build-time SW
 * toolchain is a large dependency to carry for that — on a tool whose whole point
 * is loading fast on bad mobile data.
 *
 * See specs/features/pwa-offline.md.
 */

const VERSION = 'v1';
const SHELL_CACHE = `mm-shell-${VERSION}`;
const ASSET_CACHE = `mm-assets-${VERSION}`;
const ALLOWED = [SHELL_CACHE, ASSET_CACHE];

const PRECACHE = ['/', '/portfolio', '/data/idx-tickers.json', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      // Individually, not addAll: one 404 in addAll rejects the whole install and
      // the worker never activates at all.
      .then((cache) => Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => undefined)))),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      // Delete every cache not on the allow-list so an old build's assets cannot
      // accumulate forever.
      .then((keys) => Promise.all(keys.filter((k) => !ALLOWED.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/*
 * The update is offered, not applied. Swapping assets under a user mid-
 * calculation can leave a page whose JS and HTML come from different builds, so
 * the page asks first and only then sends this message.
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

function isStatic(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/favicon.ico'
  );
}

function staleWhileRevalidate(request, cacheName) {
  return caches.open(cacheName).then((cache) =>
    cache.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.status === 200) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
}

function cacheFirst(request, cacheName) {
  return caches.open(cacheName).then((cache) =>
    cache.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.status === 200) cache.put(request, response.clone());
        return response;
      });
    }),
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  /*
   * NEVER cache the worker or the manifest. A stale service worker pins a user
   * to an old build permanently — the browser asks the CACHED worker for its own
   * update, so no redeploy can ever reach them. This is the highest-severity
   * mistake available in this file.
   */
  if (url.pathname === '/sw.js' || url.pathname === '/manifest.webmanifest') return;

  // Content-hashed: the URL changes when the content does, so cache-first is safe.
  if (isStatic(url)) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  if (url.pathname === '/data/idx-tickers.json') {
    event.respondWith(staleWhileRevalidate(request, ASSET_CACHE));
    return;
  }

  // Navigations: serve from cache when offline so the app still opens and
  // computes. Every calculation is local, so there is no reason to need a network.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/'))),
    );
    return;
  }

  event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
});
