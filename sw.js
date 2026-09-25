// Energimundo — service worker. Bump CACHE_NAME on every publish so visitors
// with an already-installed app pick up the new content instead of a stale copy.
const CACHE_NAME = "energimundo-v21";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-192-maskable.png",
  "./icon-512-maskable.png",
  "./apple-touch-icon.png",
  "./font-ebgaramond-400i.woff2",
  "./font-ebgaramond-500i.woff2",
  "./font-ebgaramond-600i.woff2",
  "./font-worksans-400.woff2",
  "./font-worksans-500.woff2",
  "./font-worksans-600.woff2",
  "./font-worksans-700.woff2",
  "./font-lexend-600.woff2",
  "./font-lexend-700.woff2",
  "./font-leaguespartan-600.woff2",
  "./font-leaguespartan-700.woff2",
  "./font-leaguespartan-800.woff2",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        ASSETS.map((url) =>
          cache.add(url).catch(() => {
            /* ignore individual asset failures so install never blocks */
          })
        )
      )
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// Stale-while-revalidate: answer instantly from cache when we have it (this is
// what makes the app open offline / on flaky wifi), and refresh the cache in
// the background whenever the network is available.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Opening the app (home-screen icon, QR link with ?v=..., shortcut) is a page
  // navigation: always answer with the cached page, whatever the query string.
  const isPage = req.mode === "navigate";

  event.respondWith(
    caches.match(req, { ignoreSearch: isPage }).then((cached) => {
      const network = fetch(req)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(isPage ? "./" : req, copy));
          }
          return response;
        })
        .catch(() => cached || (isPage ? caches.match("./") : undefined));
      return cached || network;
    })
  );
});
