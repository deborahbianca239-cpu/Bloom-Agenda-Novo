/* Service Worker da Bloom Agenda (PWA).
   - Precache do "shell" (mesma origem) para abrir offline.
   - Nunca intercepta /api/ (sempre rede).
*/
const CACHE = "bloom-agenda-v2";

const SHELL = [
  "/html/index.html",
  "/html/home.html",
  "/html/configuracoes.html",
  "/html/cadastro.html",
  "/html/esqueci-senha.html",
  "/html/manifest.webmanifest",
  "/html/icons/icon-192.png",
  "/html/icons/icon-512.png",
  "/css/style.css",
  "/js/api.js",
  "/js/pwa.js",
  "/js/tema.js",
  "/js/ia-assistente.js",
  "/js/offline-store.js",
  "/js/voz.js",
  // Libs vendorizadas (antes vinham de CDN — precisam ser same-origin
  // pra funcionar totalmente offline numa abertura "a frio").
  "/css/vendor/bootstrap.min.css",
  "/css/vendor/bootstrap-icons.css",
  "/css/vendor/fonts/bootstrap-icons.woff2",
  "/css/vendor/fonts/bootstrap-icons.woff",
  "/css/vendor/flatpickr.min.css",
  "/js/vendor/bootstrap.bundle.min.js",
  "/js/vendor/flatpickr.min.js",
  "/js/vendor/flatpickr-pt.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // addAll falha se um item falhar; usamos add individual tolerante.
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API e métodos não-GET: sempre rede, sem cache.
  if (request.method !== "GET" || url.pathname.startsWith("/api/")) return;

  // Apenas mesma origem é cacheada (CDNs ficam por conta da rede).
  if (url.origin !== self.location.origin) return;

  // Estratégia: cache primeiro, com atualização em segundo plano.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((resp) => {
          if (resp && resp.status === 200) {
            const copy = resp.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return resp;
        })
        .catch(() => cached || caches.match("/html/index.html"));
      return cached || network;
    })
  );
});
