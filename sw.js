// rexx.space service worker — makes the app installable and usable offline.
//  • App shell: precached, served cache-first (opens instantly, even in airplane mode).
//  • API data: network-first with a timeout, falling back to the last good response.
//  • Images: cache-first, capped so the cache doesn't grow forever.

const VERSION = 'v4.1.0';
const SHELL = `rexx-shell-${VERSION}`;
const DATA = 'rexx-data';
const IMG = 'rexx-img';

const SHELL_FILES = [
  './', './index.html', './css/style.css', './js/app.js', './js/api.js', './js/vault.js',
  './js/ui.js', './js/themes.js', './js/fx.js', './js/cite.js', './js/ask.js',
  './js/views/research.js', './js/views/library.js', './js/views/ask.js', './js/views/day.js', './js/views/cite-dialog.js', './js/views/live.js', './js/chart.js', './js/links.js', './js/views/reading.js', './css/themes.css', './css/fonts.css', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png',
  './icons/maskable-192.png', './icons/maskable-512.png', './icons/apple-touch-icon.png', './icons/favicon-32.png', './icons/favicon-16.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('rexx-shell-') && k !== SHELL) await caches.delete(k);
    await self.clients.claim();
  })());
});

async function trim(cacheName, max) {
  const c = await caches.open(cacheName);
  const keys = await c.keys();
  for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
}

async function networkFirst(req, timeoutMs = 7000) {
  const cache = await caches.open(DATA);
  try {
    const res = await Promise.race([
      fetch(req),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), timeoutMs)),
    ]);
    if (res.ok) { cache.put(req, res.clone()); trim(DATA, 400); }
    return res;
  } catch (err) {
    const hit = await cache.match(req);
    if (hit) return hit;
    throw err;
  }
}

async function cacheFirst(req, cacheName, max) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') { cache.put(req, res.clone()); trim(cacheName, max); }
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === location.origin) {
    // Navigations always get the shell so deep links (#/q/...) work offline.
    if (req.mode === 'navigate') {
      e.respondWith(fetch(req).catch(() => caches.match('./index.html')));
      return;
    }
    // Fonts are fetched only when a theme needs them, then kept for offline use.
    if (url.pathname.includes('/fonts/')) { e.respondWith(cacheFirst(req, SHELL, 200)); return; }
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
    return;
  }

  if (req.destination === 'image' || /\.(png|jpe?g|webp|gif|svg)$/i.test(url.pathname)) {
    e.respondWith(cacheFirst(req, IMG, 300).catch(() => new Response('', { status: 504 })));
    return;
  }

  // Map tiles / iframes etc. pass straight through.
  if (url.hostname.includes('openstreetmap.org') && !url.hostname.startsWith('nominatim')) return;

  e.respondWith(networkFirst(req));
});
