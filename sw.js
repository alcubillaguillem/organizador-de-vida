// Service worker: la app abre sin conexión. Red primero para recibir siempre la última versión.
const CACHE = "organizador-v29";
const ASSETS = [
  "./", "index.html", "styles.css", "app.js", "stats.js", "emoji.js", "categorias.js", "agenda.js", "calendario.js", "resumen.js", "rosario.js", "config.js", "vendor/supabase-js-2.117.3.js", "manifest.webmanifest",
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

// Avisos push: el resumen de la mañana. Al tocarlo se abre la app en el resumen.
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch {}
  const titulo = typeof d.titulo === "string" ? d.titulo.slice(0, 60) : "Organizador";
  const cuerpo = typeof d.cuerpo === "string" ? d.cuerpo.slice(0, 200) : "";
  e.waitUntil(self.registration.showNotification(titulo, { body: cuerpo, icon: "icons/icon-192.png", data: { url: "./#resumen" } }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL("./#resumen", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ws) => {
    const w = ws.find((c) => c.url.startsWith(self.registration.scope));
    if (!w) return self.clients.openWindow(url);
    w.postMessage({ abrir: "resumen" });
    return w.focus();
  }));
});
