/*
 * AviPrep service worker.
 *
 * Deliberately conservative: study data must always be fresh, so pages and the
 * API go to the network. The worker only
 *   - caches immutable build assets and icons for fast starts, and
 *   - shows an offline page when a navigation fails with no connection.
 *
 * Bump VERSION to drop old caches on the next visit.
 */
const VERSION = "v1"
const STATIC_CACHE = `aviprep-static-${VERSION}`
const OFFLINE_URL = "/offline.html"
const PRECACHE = [OFFLINE_URL, "/img/AviPrep-logo.png", "/android-chrome-192x192.png"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("aviprep-") && k !== STATIC_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Never cache API responses, auth, or uploads.
  if (url.pathname.startsWith("/api/")) return

  // Page loads: network first, offline page if there's no connection.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL).then((r) => r || Response.error())),
    )
    return
  }

  // Hashed build output and icons never change: cache first.
  const immutable =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /^\/(android-chrome-\d+x\d+|apple-touch-icon|favicon-\d+x\d+)\.png$/.test(url.pathname)

  if (immutable) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(request)
        if (hit) return hit
        const response = await fetch(request)
        if (response.ok) cache.put(request, response.clone())
        return response
      }),
    )
  }
})
