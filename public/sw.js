/*
 * Service worker for the installable app.
 *
 * Deliberately minimal: Chrome only treats a site as installable when a
 * service worker with a fetch handler is registered, and the one thing worth
 * handling here is a navigation that fails offline. Precaching the app's JS
 * would mean owning cache invalidation for every Next build, which is a
 * bigger commitment than "make it installable" needs — reach for Serwist if
 * full offline support is ever wanted.
 */

const CACHE = "osp-shell-v1";
const OFFLINE_URL = "/offline.html";
// The offline page renders with no network, so everything it references has to
// be in the cache beside it.
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // reload bypasses the HTTP cache so an update never precaches a stale copy.
      .then((cache) =>
        cache.addAll(PRECACHE.map((url) => new Request(url, { cache: "reload" }))),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/** Network first, falling back to whatever was precached under this URL. */
async function networkThenCache(request, fallbackUrl) {
  try {
    return await fetch(request);
  } catch {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(fallbackUrl);
    return (
      cached ??
      new Response("You are offline.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    );
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.mode === "navigate") {
    event.respondWith(networkThenCache(request, OFFLINE_URL));
    return;
  }

  // Only the precached assets are intercepted; every other request — the app's
  // own JS, API calls — goes to the network untouched.
  const url = new URL(request.url);
  if (url.origin === self.location.origin && PRECACHE.includes(url.pathname)) {
    event.respondWith(networkThenCache(request, url.pathname));
  }
});

// Lets the page hand control to a waiting worker instead of waiting for every
// tab to close.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
