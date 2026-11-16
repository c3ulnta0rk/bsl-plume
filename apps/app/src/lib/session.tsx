import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { get, getDeviceId, getToken, init, post, setToken, WS_BASE } from './api'
import type { Notice } from './types'

interface User { id: string, email: string, name: string }
interface SessionValue {
  ready: boolean
  user: User | null
  playerIds: string[]
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  /** Alerte reçue en direct, affichée en haut de l'écran. */
  alert: Notice | null
  dismissAlert: () => void
  /** Indique au serveur quel tournoi cet écran regarde. */
  watch: (tournamentId: string | null) => void
  online: boolean
}

const Ctx = createContext<SessionValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [ready, setReady] = useState(false)
  const [alert, setAlert] = useState<Notice | null>(null)
  const [online, setOnline] = useState(true)
  const watched = useRef<string | null>(null)
  const socket = useRef<WebSocket | null>(null)

  useEffect(() => { void init().then(() => setReady(true)) }, [])

  const me = useQuery({
    queryKey: ['me'],
    enabled: ready,
    queryFn: () => (getToken() ? get<{ user: User | null, playerIds: string[] }>('/auth/me') : Promise.resolve({ user: null, playerIds: [] })),
    staleTime: 60_000
  })

  // Connexion temps réel, relancée toute seule en cas de coupure (réseau de gymnase).
  useEffect(() => {
    if (!ready) return
    let closed = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let attempt = 0
    const connect = () => {
      const ws = new WebSocket(`${WS_BASE}/ws?device=${encodeURIComponent(getDeviceId() ?? '')}${watched.current ? `&tournament=${watched.current}` : ''}`)
      socket.current = ws
      ws.onopen = () => {
        attempt = 0
        setOnline(true)
        // on a pu manquer des changements pendant la coupure
        void qc.invalidateQueries({ queryKey: ['t'] })
      }
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(String(e.data)) as { type: string, tournament?: string, notification?: Notice }
          if (msg.type === 'changed') void qc.invalidateQueries({ queryKey: ['t'] })
          if (msg.type === 'notification' && msg.notification) {
            setAlert(msg.notification)
            void qc.invalidateQueries({ queryKey: ['notifications'] })
          }
        } catch { /* message ignoré */ }
      }
      ws.onclose = () => {
        if (closed) return
        setOnline(false)
        timer = setTimeout(connect, Math.min(15_000, 1000 * 2 ** attempt++))
      }
      ws.onerror = () => ws.close()
    }
    connect()
    return () => { closed = true; clearTimeout(timer); socket.current?.close() }
  }, [ready, qc])

  const watch = useCallback((tournamentId: string | null) => {
    watched.current = tournamentId
    const ws = socket.current
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'watch', tournament: tournamentId }))
  }, [])

  const value = useMemo<SessionValue>(() => ({
    ready,
    user: me.data?.user ?? null,
    playerIds: me.data?.playerIds ?? [],
    async login(email, password) {
      const r = await post<{ token: string }>('/auth/login', { email, password })
      await setToken(r.token)
      await qc.invalidateQueries()
    },
    async register(name, email, password) {
      const r = await post<{ token: string }>('/auth/register', { name, email, password })
      await setToken(r.token)
      await qc.invalidateQueries()
    },
    async logout() {
      await post('/auth/logout').catch(() => {})
      await setToken(null)
      qc.clear()
      await qc.invalidateQueries()
    },
    alert,
    dismissAlert: () => setAlert(null),
    watch,
    online
  }), [ready, me.data, alert, watch, online, qc])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSession(): SessionValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('SessionProvider manquant')
  return v
}
