/* Caches the player, fonts, and the demo lesson after the first visit.
 * Paths are relative to the service worker scope, so the same file works
 * at the site root and under a GitHub Pages subpath such as /sign-window/.
 */
const CACHE = 'sign-window-v13'
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
  '/demo/print.js',
  '/demo/certificates.json',
  '/demo/signs.json',
  '/demo/timeline.json',
  '/demo/en.vtt',
  '/demo/am.vtt',
  '/demo/ad.vtt',
  '/demo/audio/ad-01.mp3',
  '/demo/audio/ad-02.mp3',
  '/demo/audio/ad-03.mp3',
  '/demo/audio/ad-04.mp3',
  '/demo/audio/ad-05.mp3',
  '/demo/audio/ad-06.mp3',
  '/demo/audio/ad-07.mp3',
  '/demo/audio/ad-08.mp3',
  '/demo/audio/ad-09.mp3',
  '/demo/audio/ad-10.mp3',
  '/demo/audio/ad-11.mp3',
  '/demo/audio/ad-12.mp3',
  '/demo/audio/ad-13.mp3',
  '/demo/audio/ad-14.mp3',
  '/demo/audio/ad-15.mp3',
  '/demo/audio/ad-16.mp3',
  '/demo/audio/ad-17.mp3',
  '/demo/audio/ad-18.mp3',
  '/demo/audio/ad-19.mp3',
  '/demo/audio/ad-20.mp3',
  '/demo/audio/ad-21.mp3',
  '/demo/audio/ad-22.mp3',
  '/demo/audio/job-summary.mp3',
  '/demo/lesson.mp4',
  '/demo/family-signs-offline.zip',
  '/demo/signs/f1.mp4',
  '/demo/signs/f2.mp4',
  '/demo/signs/f3.mp4',
  '/demo/signs/f4.mp4',
  '/demo/signs/f5.mp4',
  '/demo/signs/f6.mp4',
  '/demo/signs/f7.mp4',
  '/demo/signs/f8.mp4',
  '/demo/signs/f9.mp4',
  '/demo/signs/f10.mp4',
  '/demo/signs/f11.mp4',
  '/demo/signs/f12.mp4',
  '/demo/signs/f15.mp4',
  '/demo/signs/f17.mp4',
  '/player/signwindow.js',
  '/player/signwindow.css',
  '/player/media.js',
  '/player/sw.js',
  '/sw.js',
  '/player/fonts/noto-sans-ethiopic-ethiopic-400-normal.woff2',
  '/player/fonts/noto-sans-ethiopic-latin-400-normal.woff2',
  '/player/fonts/noto-sans-ethiopic-latin-ext-400-normal.woff2'
]

function scopeUrl() {
  return new URL(self.registration.scope)
}

function abs(path) {
  return new URL(String(path).replace(/^\//, ''), scopeUrl()).href
}

function relativePath(url) {
  const base = scopeUrl().pathname
  const path = url.pathname
  if (base === '/') return path.replace(/^\//, '')
  const prefix = base.endsWith('/') ? base : base + '/'
  if (path === prefix.slice(0, -1) || path === prefix) return ''
  if (path.startsWith(prefix)) return path.slice(prefix.length)
  return null
}

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(CACHE).then(function (cache) {
    return cache.addAll(PRECACHE.map(abs))
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
  const rel = relativePath(url)
  if (rel == null || rel.indexOf('api/') === 0) return

  const html = rel === '' || rel.endsWith('.html')
  const fresh = html || /\.(mp4|mp3|vtt|json|js|css|zip)$/.test(rel)
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
        if (response && response.ok && (rel.indexOf('player/') === 0 || rel.indexOf('demo/') === 0)) {
          cache.put(event.request, response.clone())
        }
        return response
      })
    })
  }))
})
