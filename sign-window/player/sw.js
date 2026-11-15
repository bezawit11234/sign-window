/* Caches the player, fonts, and the demo lesson after the first visit. */
const CACHE = 'sign-window-v7'
const PRECACHE = [
  '/',
  '/demo/index.html',
  '/demo/site.css',
  '/demo/kit.js',
  '/demo/lesson.js',
  '/demo/job.html',
  '/demo/job.js',
  '/demo/verify.html',
  '/demo/verify.js',
  '/demo/transcript.html',
  '/demo/certificates.json',
  '/demo/signs.json',
  '/demo/timeline.json',
  '/demo/en.vtt',
  '/demo/am.vtt',
  '/demo/ad.vtt',
  '/demo/lesson.mp4',
  '/player/signwindow.js',
  '/player/signwindow.css',
  '/player/media.js',
  '/player/sw.js',
  '/player/fonts/noto-sans-ethiopic-ethiopic-400-normal.woff2',
  '/player/fonts/noto-sans-ethiopic-latin-400-normal.woff2',
  '/player/fonts/noto-sans-ethiopic-latin-ext-400-normal.woff2'
]

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(CACHE).then(function (cache) {
    return cache.addAll(PRECACHE)
  }).then(function () {
    return self.skipWaiting()
  }))
})

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (key) {
      return key !== CACHE
    }).map(function (key) {
      return caches.delete(key)
    }))
  }).then(function () {
    return self.clients.claim()
  }))
})

self.addEventListener('fetch', function (event) {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET') return
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  const html = url.pathname.endsWith('.html') || url.pathname === '/'
  const fresh = html || /\.(mp4|vtt|json|js|css)$/.test(url.pathname)
  event.respondWith(caches.open(CACHE).then(function (cache) {
    if (fresh) {
      return fetch(event.request).then(function (response) {
        if (response && response.ok) cache.put(event.request, response.clone())
        return response
      }).catch(function () {
        return cache.match(event.request).then(function (cached) {
          return cached || new Response('This page is not available offline yet.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          })
        })
      })
    }
    return cache.match(event.request).then(function (cached) {
      if (cached) return cached
      return fetch(event.request).then(function (response) {
        if (response && response.ok && (url.pathname.startsWith('/player/') || url.pathname.startsWith('/demo/'))) {
          cache.put(event.request, response.clone())
        }
        return response
      })
    })
  }))
})
