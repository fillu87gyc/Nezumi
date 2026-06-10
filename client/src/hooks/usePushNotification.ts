import { apiFetch } from '../api/client'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export async function subscribePushNotifications(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return false

    const registration = await navigator.serviceWorker.ready
    const applicationServerKey = VAPID_PUBLIC_KEY
      ? urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      : undefined

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      ...(applicationServerKey ? { applicationServerKey } : {}),
    })

    await apiFetch('/api/notify/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription),
    })

    return true
  } catch {
    return false
  }
}
