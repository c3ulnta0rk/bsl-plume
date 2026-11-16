import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { del, get, post } from './api'
import { useSession } from './session'
import type { Entry, Follow, Match, Notice, Snapshot } from './types'

/** État complet d'un tournoi, tenu à jour en direct. */
export function useSnapshot(slug: string | undefined) {
  const { watch, ready } = useSession()
  const q = useQuery({
    queryKey: ['t', slug],
    enabled: ready && !!slug,
    queryFn: () => get<Snapshot>(`/tournaments/${slug}`),
    // filet de sécurité si le temps réel est coupé, et rafraîchissement des heures estimées
    refetchInterval: 30_000,
    staleTime: 2_000
  })
  const id = q.data?.tournament.id
  useEffect(() => {
    if (!id) return
    watch(id)
    return () => watch(null)
  }, [id, watch])
  return q
}

/** Index pratiques dérivés de l'état du tournoi. */
export function useIndex(snap: Snapshot | undefined) {
  return useMemo(() => {
    const entries = new Map<string, Entry>()
    const categoryOf = new Map<string, Snapshot['categories'][number]>()
    for (const c of snap?.categories ?? []) {
      categoryOf.set(c.id, c)
      for (const e of c.entries) entries.set(e.id, e)
    }
    const courts = new Map((snap?.courts ?? []).map(c => [c.id, c]))
    const matches = new Map((snap?.matches ?? []).map(m => [m.id, m]))
    const playersOf = (m: Match) => [m.entry1Id, m.entry2Id].flatMap(id => (id ? entries.get(id)?.players ?? [] : []))
    const matchesOfPlayer = (playerId: string) => (snap?.matches ?? []).filter(m => playersOf(m).some(p => p.id === playerId))
    return { entries, categoryOf, courts, matches, playersOf, matchesOfPlayer }
  }, [snap])
}

export function useFollows() {
  const qc = useQueryClient()
  const { ready } = useSession()
  const q = useQuery({ queryKey: ['follows'], enabled: ready, queryFn: () => get<Follow[]>('/follows'), staleTime: 30_000 })
  const follow = useMutation({
    mutationFn: (v: { playerId: string, isMe?: boolean }) => post('/follows', { playerId: v.playerId, isMe: !!v.isMe }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['follows'] })
  })
  const unfollow = useMutation({
    mutationFn: (playerId: string) => del(`/follows/${playerId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['follows'] })
  })
  const list = q.data ?? []
  return { list, ids: new Set(list.map(f => f.playerId)), me: new Set(list.filter(f => f.isMe).map(f => f.playerId)), follow, unfollow, loading: q.isLoading }
}

export function useNotifications() {
  const { ready } = useSession()
  return useQuery({ queryKey: ['notifications'], enabled: ready, queryFn: () => get<Notice[]>('/notifications'), staleTime: 10_000 })
}

/** Heure courante, rafraîchie régulièrement pour les comptes à rebours. */
export function useNow(everyMs = 20_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), everyMs)
    return () => clearInterval(t)
  }, [everyMs])
  return now
}
