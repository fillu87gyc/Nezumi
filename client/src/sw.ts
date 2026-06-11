import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare let self: ServiceWorkerGlobalScope

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener('push', (event) => {
  const data = event.data?.json() as { title?: string; body?: string; url?: string } | undefined
  const title = data?.title ?? 'Nezumi'
  const body = data?.body ?? '新しい通知があります'
  const url = data?.url ?? '/'

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/192.png',
      badge: '/icons/192.png',
      data: { url },
      actions: [
        { action: 'open', title: '開く' },
        { action: 'dismiss', title: '閉じる' },
      ],
    })
  )
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
