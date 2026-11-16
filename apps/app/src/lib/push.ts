import { Platform } from 'react-native'
import { del, get, post } from './api'

export type PushState = 'unsupported' | 'denied' | 'off' | 'on'

function b64ToBytes(s: string): Uint8Array {
  const pad = '='.repeat((4 - (s.length % 4)) % 4)
  const raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}

const webSupported = () => Platform.OS === 'web' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator && typeof window !== 'undefined' && 'PushManager' in window && 'Notification' in window

export async function pushState(): Promise<PushState> {
  if (Platform.OS !== 'web') {
    try {
      const N = await import('expo-notifications')
      const p = await N.getPermissionsAsync()
      return p.granted ? 'on' : p.canAskAgain ? 'off' : 'denied'
    } catch { return 'unsupported' }
  }
  if (!webSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  return sub ? 'on' : 'off'
}

/** Active les notifications sur cet appareil et l'enregistre auprès du serveur. */
export async function enablePush(): Promise<PushState> {
  if (Platform.OS !== 'web') {
    try {
      const N = await import('expo-notifications')
      const p = await N.requestPermissionsAsync()
      if (!p.granted) return 'denied'
      const token = await N.getExpoPushTokenAsync()
      await post('/push/subscribe', { kind: 'expo', payload: { token: token.data } })
      return 'on'
    } catch { return 'unsupported' }
  }
  if (!webSupported()) return 'unsupported'
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return 'denied'
  const reg = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready
  const { publicKey } = await get<{ publicKey: string }>('/push/key')
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(publicKey) as BufferSource }))
  await post('/push/subscribe', { kind: 'web', payload: sub.toJSON() })
  return 'on'
}

export async function disablePush(): Promise<void> {
  if (Platform.OS === 'web' && webSupported()) {
    const reg = await navigator.serviceWorker.getRegistration()
    await (await reg?.pushManager.getSubscription())?.unsubscribe()
  }
  await del('/push/subscribe').catch(() => {})
}
