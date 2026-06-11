/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

declare let self: ServiceWorkerGlobalScope

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// フィード API: NetworkFirst（オフライン時はキャッシュ済みフィードを表示）
// Access セッション切れ時のログイン HTML をキャッシュしないよう 200 のみキャッシュ対象
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/feed'),
  new NetworkFirst({
    cacheName: 'api-feed-cache',
    networkTimeoutSeconds: 5,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 3600 }),
    ],
  })
)

// 画像: CacheFirst
registerRoute(
  ({ url }) => /\.(jpg|jpeg|png|webp|gif)$/.test(url.pathname),
  new CacheFirst({
    cacheName: 'image-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 86400 })],
  })
)

self.addEventListener('push', (event) => {
  const data = event.data?.json() as { title?: string; body?: string; url?: string } | undefined
  const title = data?.title ?? 'Nezumi'
  const body = data?.body ?? '新しい通知があります'
  const url = data?.url ?? '/'

  // actions は SW 通知でのみ有効だが TS の NotificationOptions 型から落ちているため拡張する
  const options: NotificationOptions & { actions?: { action: string; title: string }[] } = {
    body,
    icon: '/icons/192.png',
    badge: '/icons/192.png',
    data: { url },
    actions: [
      { action: 'open', title: '開く' },
      { action: 'dismiss', title: '閉じる' },
    ],
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'dismiss') return

  const url = (event.notification.data as { url: string }).url ?? '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('navigate' in client) {
          return (client as WindowClient).focus().then((c) => c.navigate(url))
        }
      }
      return self.clients.openWindow(url)
    })
  )
})
