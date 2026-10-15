/**
 * The service worker that makes the site installable as an app, and lets it open with no signal.
 *
 * Deliberately small, because a service worker that caches too much is how a site gets stuck on
 * an old deploy. It touches only two kinds of request, both from this site:
 *
 * - Pages: always from the network, so a deploy shows up straight away. The last one fetched is
 *   kept, and served only when the network fails — every route is the same index.html, so one
 *   copy opens any of them. With no signal the app still opens; its data will say it could not
 *   load, as it does now.
 * - /assets/: Vite names these by their contents, so a file at a given address never changes
 *   and the cached copy is always right. Kept to the newest few dozen so old deploys fall away.
 *
 * Everything else — Supabase, /api, Google Fonts, photos — goes straight past untouched.
 *
 * Change VERSION to throw away everything this worker has cached on every phone.
 */
const VERSION = 'v1'
const PAGES = `pages-${VERSION}`
const ASSETS = `assets-${VERSION}`
const MAX_ASSETS = 60

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = [PAGES, ASSETS]
      for (const name of await caches.keys()) if (!keep.includes(name)) await caches.delete(name)
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') event.respondWith(page(request))
  else if (url.pathname.startsWith('/assets/')) event.respondWith(asset(request))
})

async function page(request) {
  try {
    const response = await fetch(request)
    if (response.ok && response.type === 'basic') {
      const cache = await caches.open(PAGES)
      await cache.put('/', response.clone())
    }
    return response
  } catch (error) {
    const cached = await caches.match('/', { cacheName: PAGES })
    if (cached) return cached
    throw error
  }
}

async function asset(request) {
  const cache = await caches.open(ASSETS)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) {
    await cache.put(request, response.clone())
    // Oldest first, in the order they were added.
    const keys = await cache.keys()
    for (const key of keys.slice(0, Math.max(0, keys.length - MAX_ASSETS))) await cache.delete(key)
  }
  return response
}
