// Service worker: la app abre sin conexión. Red primero para recibir siempre la última versión.
const CACHE = "organizador-v13";
const ASSETS = [
  "./", "index.html", "styles.css", "app.js", "stats.js", "emoji.js", "categorias.js", "agenda.js", "config.js", "vendor/supabase-js-2.117.3.js", "manifest.webmanifest",
  "vendor/fonts/inter-latin.woff2", "vendor/fonts/space-grotesk-latin.woff2",
  "icons/icon.svg", "icons/icon-192.png", "icons/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request, { cache: "no-cache" })
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
