import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { MatchCard, MatchRow } from '@/features/match'
import { useDensity, useTournament } from '@/features/tournament'
import type { Match } from '@/lib/types'
import { Appear, Card, Empty, Row, Screen, space, stagger, Switcher, Tabs, useWide } from '@/ui'

type Filter = 'live' | 'next' | 'done'

export default function Matches() {
  const wide = useWide()
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const { snap, ctx, q } = useTournament(slug)
  const [filter, setFilter] = useState<Filter | null>(null)
  const [cat, setCat] = useState('all')
  const [dense, setDense] = useDensity(wide)
  if (!snap) return null
  const inCat = snap.matches.filter(m => cat === 'all' || m.categoryId === cat)
  const groups: Record<Filter, Match[]> = {
    live: inCat.filter(m => m.status === 'playing' || m.status === 'called').sort((a, b) => (a.calledAt ?? 0) - (b.calledAt ?? 0)),
    next: inCat.filter(m => m.status === 'pending').sort((a, b) => (a.estimatedStart ?? Infinity) - (b.estimatedStart ?? Infinity) || a.number - b.number),
    done: inCat.filter(m => m.status === 'completed').sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0))
  }
  const current: Filter = filter ?? (groups.live.length ? 'live' : groups.next.length ? 'next' : 'done')
  const list = groups[current]
  return (
    <Screen onRefresh={() => void q.refetch()} refreshing={q.isRefetching}>
      <Tabs
        value={current}
        onChange={setFilter}
        options={[
          { value: 'live', label: `En cours (${groups.live.length})` },
          { value: 'next', label: `À venir (${groups.next.length})` },
          { value: 'done', label: `Terminés (${groups.done.length})` }
        ]}
      />
      <Row wrap justify="space-between" gap={space.md}>
        <View style={{ flexShrink: 1 }}>
          <Tabs value={cat} onChange={setCat} options={[{ value: 'all', label: 'Tous les tableaux' }, ...snap.categories.map(c => ({ value: c.id, label: c.name }))]} />
        </View>
        <Switcher value={dense} onChange={setDense} label="Vue condensée" />
      </Row>
      {list.length === 0
        ? <Empty icon="tennisball-outline" title={current === 'live' ? 'Aucun match sur les terrains' : current === 'next' ? 'Aucun match à venir' : 'Aucun match terminé'} text={snap.matches.length === 0 ? 'Les matchs apparaîtront après le tirage au sort.' : undefined} />
        : dense
          ? <Appear key={`${current}-${cat}-dense`}><Card pad={0} style={{ overflow: 'hidden' }}>{list.map(m => <MatchRow key={m.id} m={m} ctx={ctx} />)}</Card></Appear>
          : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
                {list.map((m, i) => <Appear key={`${current}-${m.id}`} delay={stagger(i)} style={{ flexGrow: 1, flexBasis: wide ? 340 : '100%', maxWidth: wide ? 540 : undefined }}><MatchCard m={m} ctx={ctx} /></Appear>)}
              </View>
            )}
    </Screen>
  )
}
