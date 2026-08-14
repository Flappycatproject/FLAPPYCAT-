// ============================================================
// FLAPPY CAT - service-worker.js
// Service worker: cache file inti supaya game bisa dibuka
// ulang walau tanpa koneksi internet (offline support).
//
// PENTING: memakai strategi "network-first" (bukan cache-first)
// supaya update kode game selalu langsung terpakai begitu file
// baru di-deploy, dan cache cuma jadi cadangan saat offline saja.
// ============================================================

// Naikkan angka versi ini setiap kali file game diperbarui,
// supaya cache lama otomatis dibuang dan diganti yang baru.
const CACHE_NAME = 'flappycat-cache-v2';
const FILES_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './audio.js',
  './entities.js',
  './game.js',
  './manifest.json',
  './assets/cat.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
