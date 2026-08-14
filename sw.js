/* Service worker de Ciclo.
   Cache-first para que la app abra sin conexión, con revalidación en segundo
   plano para que una versión nueva llegue sin tener que borrar nada.
   Sube CACHE cuando cambies archivos: al activarse borra las versiones viejas. */
const CACHE = "ciclo-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icono-192.png",
  "./icono-512.png",
  "./icono-maskable.png",
  "./fuentes/adw-400.woff2",
  "./fuentes/adw-700.woff2",
  "./fuentes/jb-med.woff2",
  "./fuentes/jb-xbold.woff2"
];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // addAll falla entero si un archivo falta; así un 404 no deja la app sin caché
    await Promise.all(ASSETS.map(u => c.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== location.origin) return;   // nada externo: la app no lo usa

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cacheada = await cache.match(req, { ignoreSearch:true });
    const red = fetch(req).then(r => {
      if (r && r.ok) cache.put(req, r.clone());
      return r;
    }).catch(() => null);
    return cacheada || (await red) || new Response("Sin conexión y sin copia guardada.", {
      status: 503, headers: { "Content-Type":"text/plain; charset=utf-8" }
    });
  })());
});
