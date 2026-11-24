// Service worker: lets the app open without a network connection after the
// first visit. Strategy: answer from the cache right away when possible and
// refresh the cached copy in the background.

const CACHE = 'body-decomposition-v2';
const SHELL = [
  './', 'index.html', 'css/app.css', 'manifest.webmanifest', 'icons/icon.svg',
  'js/main.js', 'js/core.js', 'js/ui.js', 'js/catalog.js', 'js/motion.js', 'js/attach.js', 'js/quiz.js',
  'vendor/three.module.min.js', 'vendor/OrbitControls.js', 'vendor/GLTFLoader.js', 'vendor/BufferGeometryUtils.js', 'vendor/meshopt_decoder.module.js', 'vendor/meshopt_decoder_reference.js',
  'data/anatomy.json', 'models/manifest.json', 'models/skeleton.glb', 'models/muscles.glb', 'models/other.glb',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const fresh = fetch(req).then((res) => {
        if (res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => cached);
      return cached || fresh;
    }),
  );
});
