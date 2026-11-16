import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'

/**
 * Adresse du serveur.
 * - Web servi par le serveur lui-même (production, mode salle) : même origine.
 * - Web en développement (Expo sur un autre port) : même machine, port 4000.
 * - Application mobile : EXPO_PUBLIC_API_URL à la compilation.
 */
function resolveBase(): string {
  const env = process.env.EXPO_PUBLIC_API_URL
  if (env) return env.replace(/\/$/, '')
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const { protocol, hostname, port, origin } = window.location
    if (port === '8081' || port === '19006') return `${protocol}//${hostname}:4000`
    return origin
  }
  return 'http://localhost:4000'
}

export const API_BASE = resolveBase()
export const WS_BASE = API_BASE.replace(/^http/, 'ws')

let token: string | null = null
let deviceId: string | null = null
let ready: Promise<void> | null = null

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16)
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export function init(): Promise<void> {
  ready ??= (async () => {
    try {
      token = await AsyncStorage.getItem('plume.token')
      deviceId = await AsyncStorage.getItem('plume.device')
      if (!deviceId) {
        deviceId = uuid()
        await AsyncStorage.setItem('plume.device', deviceId)
      }
    } catch {
      deviceId ??= uuid()
    }
  })()
  return ready
}

export const getDeviceId = () => deviceId
export const getToken = () => token
export async function setToken(t: string | null): Promise<void> {
  token = t
  try {
    if (t) await AsyncStorage.setItem('plume.token', t)
    else await AsyncStorage.removeItem('plume.token')
  } catch { /* stockage indisponible */ }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

export async function api<T = unknown>(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<T> {
  await init()
  let res: Response
  try {
    res = await fetch(`${API_BASE}/api${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(deviceId ? { 'x-device-id': deviceId } : {})
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    })
  } catch {
    throw new ApiError(0, 'Serveur injoignable. Vérifiez votre connexion.')
  }
  const data = await res.json().catch(() => null) as { error?: string } | null
  if (!res.ok) throw new ApiError(res.status, data?.error ?? `Erreur ${res.status}`)
  return data as T
}

export const get = <T>(path: string) => api<T>('GET', path)
export const post = <T = { ok: true }>(path: string, body: unknown = {}) => api<T>('POST', path, body)
export const patch = <T = { ok: true }>(path: string, body: unknown) => api<T>('PATCH', path, body)
export const del = <T = { ok: true }>(path: string) => api<T>('DELETE', path)
