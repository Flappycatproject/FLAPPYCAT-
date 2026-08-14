// ============================================================
// FLAPPY CAT - service-worker.js
// Service worker sederhana: cache file inti supaya game bisa
// dibuka ulang walau tanpa koneksi internet (offline support).
// ============================================================

const CACHE_NAME = 'flappycat-cache-v1';
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

// Simpan file inti ke cache saat service worker pertama kali dipasang
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

// Bersihkan cache versi lama saat service worker baru aktif
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

// Strategi "cache-first": pakai file dari cache dulu, baru ke jaringan jika tidak ada
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
