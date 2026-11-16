import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect, useMemo, useState } from 'react'
import { useFollows, useIndex, useNow, useSnapshot } from '@/lib/data'
import type { MatchContext } from './match'

/** Tout ce dont un écran de tournoi a besoin : état en direct, index, joueurs suivis. */
export function useTournament(slugOrId: string | undefined) {
  const q = useSnapshot(slugOrId)
  const snap = q.data
  const idx = useIndex(snap)
  const follows = useFollows()
  const now = useNow()
  const ctx: MatchContext = useMemo(() => ({
    entries: idx.entries, categoryOf: idx.categoryOf, courts: idx.courts, slug: snap?.tournament.slug ?? '', now, followed: follows.ids
  }), [idx, snap?.tournament.slug, now, follows.ids])
  return { q, snap, idx, ctx, follows, now }
}

/** Préférence d'affichage mémorisée : cartes détaillées ou liste condensée. */
export function useDensity(defaultDense: boolean): [boolean, (v: boolean) => void] {
  const [dense, setDense] = useState(defaultDense)
  const [touched, setTouched] = useState(false)
  useEffect(() => {
    AsyncStorage.getItem('plume.dense').then((v) => {
      if (v !== null) { setDense(v === '1'); setTouched(true) }
    }).catch(() => {})
  }, [])
  useEffect(() => { if (!touched) setDense(defaultDense) }, [defaultDense, touched])
  return [dense, (v) => { setDense(v); setTouched(true); AsyncStorage.setItem('plume.dense', v ? '1' : '0').catch(() => {}) }]
}
