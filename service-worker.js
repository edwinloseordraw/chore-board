const CACHE_NAME = "chore-board-v5";

const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icon.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : null))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Always fetch latest school calendar image (do NOT cache month.png)
  if (request.method === "GET" && request.url.includes("month.png")) {
    event.respondWith(fetch(request));
    return;
  }

  // Network-first strategy
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (request.method === "GET" && !request.url.includes("month.png")) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => cached || caches.match("./"))
      )
  );
});
