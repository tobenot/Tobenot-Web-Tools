/*
 * Service Worker。
 *
 * CACHE_NAME 中的 __BUILD_ID__ 由构建时替换（见 vite.config.ts 的 swVersionPlugin）。
 * 此前该值硬编码为 'v1' 且从未变更，导致 activate 里的旧缓存清理逻辑永不触发，
 * 用户总是慢一个版本才看到新的 index.html。
 */
const CACHE_NAME = 'mecha-tools-__BUILD_ID__'

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  )
  // 不再无条件 skipWaiting：改由页面在用户确认后发消息触发，
  // 避免刷新时新旧资源混用导致的 chunk 加载失败。
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetched = fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
        }
        return response
      }).catch(() => cached)

      return cached || fetched
    })
  )
})
