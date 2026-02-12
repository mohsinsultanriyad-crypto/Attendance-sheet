const CACHE_NAME = "attendance-pro-v3";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll([
        "/", 
        "/index.html",
        "/manifest.json",
        "/sw.js"
      ])
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))))
    )
  );
  self.clients.claim();
});

// Cache-first for same-origin GET requests
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // only GET
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // only same-origin (avoid caching tailwind CDN etc)
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      return (
        cached ||
        fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
      );
    })
  );
});
