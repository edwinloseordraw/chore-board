const CACHE_NAME = "chore-board-v10";

const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
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
  if (request.method !== "GET") return;

  const url = request.url;

  // JS modules: always network-only, no caching
  if (url.includes(".js")) {
    event.respondWith(fetch(request, { cache: "no-store" }));
    return;
  }

  // School calendar image: always network-only
  if (url.includes("month.png")) {
    event.respondWith(fetch(request));
    return;
  }

  // Everything else (HTML, CSS, icons): network-first, cache fallback
  event.respondWith(
    fetch(request, { cache: "no-store" })
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => cached || caches.match("./"))
      )
  );
});
