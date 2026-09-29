// Energimundo — service worker. Bump CACHE_NAME on every publish so visitors
// with an already-installed app pick up the new content instead of a stale copy.
const CACHE_NAME = "energimundo-v39";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-192-maskable.png",
  "./icon-512-maskable.png",
  "./apple-touch-icon.png",
  "./font-leaguespartan-300.woff2",
  "./font-leaguespartan-400.woff2",
  "./font-leaguespartan-500.woff2",
  "./font-leaguespartan-600.woff2",
  "./font-leaguespartan-700.woff2",
  "./font-leaguespartan-800.woff2",
  "./font-leaguespartan-900.woff2",
  "./font-jetbrainsmono-700.woff2",
  // photos and logos (separate files since v34; generate.py refuses to build if one is missing here)
  "./img-logo-icon-sq.png",
  "./img-logo-saltogrande-sm.png",
  "./img-energimundo-building.jpg",
  "./img-plasma-ball-crop.jpg",
  "./img-history-timeline.png",
  "./img-interactive-room.jpg",
  "./img-interactive-inset.jpg",
  "./img-hydropower-room.jpg",
  "./img-binational-hq.jpg",
  "./img-solar-model.jpg",
  "./img-wind-eolica-hq.jpg",
  "./img-biomass-wall.jpg",
  "./img-cronomundo-hq.jpg",
  "./img-timeline-icons.jpg",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        ASSETS.map((url) =>
          // cache:"reload" skips the browser's HTTP cache (GitHub Pages sends max-age=600),
          // so a new version never precaches a copy of index.html that is up to 10 minutes old.
          cache.add(new Request(url, { cache: "reload" })).catch(() => {
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
