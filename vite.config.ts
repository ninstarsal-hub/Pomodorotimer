import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Emits /sw.js (the offline service worker) with the list of files from this
 * build baked in, so every deploy gets a fresh cache and old files are cleaned up.
 */
function serviceWorker(): Plugin {
  return {
    name: 'stillpoint-sw',
    apply: 'build',
    generateBundle(_, bundle) {
      const files = Object.keys(bundle);
      // Big parsers (PDF/Word/PowerPoint import, math fonts) are cached the first time they're used instead.
      const lazy = /pdf|mammoth|jszip|KaTeX_|katex/i;
      const precache = ['/', ...files.filter((f) => !lazy.test(f) && !f.endsWith('.map')).map((f) => '/' + f)];
      const statics = ['/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png'];
      const version = Date.now().toString(36);
      const source = SW_TEMPLATE.replace('__VERSION__', version).replace('__PRECACHE__', JSON.stringify([...precache, ...statics]));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

const SW_TEMPLATE = `/* Stillpoint service worker — generated at build time. */
const VERSION = '__VERSION__';
const CACHE = 'stillpoint-' + VERSION;
const PRECACHE = __PRECACHE__;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('stillpoint-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Pages: try the network for the newest version, fall back to the cached app when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/', { ignoreSearch: true })),
    );
    return;
  }

  // Same-origin files (hashed, never change) and Google Fonts: cache first, save on first use.
  const sameOrigin = url.origin === self.location.origin;
  const fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!sameOrigin && !fonts) return; // YouTube, Spotify etc. go straight to the network
  if (sameOrigin && url.pathname === '/sw.js') return;

  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok || res.type === 'opaque') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
`;

export default defineConfig({
  plugins: [react(), serviceWorker()],
});
