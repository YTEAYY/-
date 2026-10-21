const CACHE_NAME = "ootd-diary-v2";
const APP_BASE = new URL("./", self.location.href);
const APP_SHELL = ["", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png"]
  .map((path) => new URL(path, APP_BASE).href);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 날씨 API(open-meteo 등)는 항상 네트워크 우선, 그 외 정적 파일은 캐시 우선
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isApi = url.origin !== self.location.origin || url.pathname.includes("/api/");

  if (isApi || event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request)
          .then((res) => {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
            return res;
          })
          .catch(() => cached)
      );
    })
  );
});
