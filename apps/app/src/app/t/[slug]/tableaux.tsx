import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { BracketView } from '@/features/bracket'
import { MatchCard, MatchRow } from '@/features/match'
import { PoolTable } from '@/features/pool'
import { useDensity, useTournament } from '@/features/tournament'
import { DISCIPLINES } from '@/lib/format'
import { Appear, Card, Chip, Empty, Row, Screen, Section, space, stagger, Switcher, T, Tabs, useTheme, useWide } from '@/ui'

export default function Draws() {
  const t = useTheme()
  const wide = useWide()
  const { slug, c } = useLocalSearchParams<{ slug: string, c?: string }>()
  const { snap, ctx, q } = useTournament(slug)
  const [picked, setPicked] = useState<string | null>(null)
  const [dense, setDense] = useDensity(wide)
  if (!snap) return null
  if (snap.categories.length === 0) return <Screen><Empty title="Aucun tableau pour le moment" /></Screen>
  const cat = snap.categories.find(x => x.id === (picked ?? c)) ?? snap.categories[0]!
  const matches = snap.matches.filter(m => m.categoryId === cat.id)
  const bracket = matches.filter(m => m.phase === 'bracket')
  return (
    <Screen onRefresh={() => void q.refetch()} refreshing={q.isRefetching}>
      <Tabs value={cat.id} onChange={setPicked} options={snap.categories.map(x => ({ value: x.id, label: x.name }))} />
      <Row wrap justify="space-between">
        <Row wrap>
          <Chip label={DISCIPLINES[cat.discipline]} />
          {cat.level ? <Chip label={cat.level} /> : null}
          <Chip label={`${cat.counts.accepted} / ${cat.maxEntries} inscrits`} tone="info" />
        </Row>
        {cat.pools.length > 0 ? <Switcher value={dense} onChange={setDense} label="Vue condensée" /> : null}
      </Row>

      {cat.status === 'registration'
        ? (
            <Section title="Inscrits">
              {cat.entries.length === 0
                ? <Empty icon="people-outline" title="Pas encore d'inscrit validé" text="Le tirage au sort sera fait par l'organisateur à la clôture des inscriptions." />
                : (
                    <Card pad={0} style={{ overflow: 'hidden' }}>
                      {cat.entries.map((e, i) => (
                        <Row key={e.id} style={{ padding: space.md, borderBottomWidth: i === cat.entries.length - 1 ? 0 : 1, borderColor: t.line }} justify="space-between">
                          <View style={{ flex: 1 }}>
                            <T v="h3">{e.name}</T>
                            <T v="small" color={t.muted}>{[...new Set(e.players.map(p => p.club).filter(Boolean))].join(' / ')}</T>
                          </View>
                          {e.seed ? <Chip label={`Tête de série ${e.seed}`} tone="accent" small /> : null}
                        </Row>
                      ))}
                    </Card>
                  )}
            </Section>
          )
        : null}

      {bracket.length > 0
        ? (
            <Section title="Tableau final" right={<T v="small" color={t.muted}>{cat.bracketRulesText}</T>}>
              <Appear key={cat.id} axis="x" from={24}><BracketView category={cat} matches={matches} ctx={ctx} /></Appear>
            </Section>
          )
        : null}

      {cat.pools.length > 0
        ? (
            <Section title="Poules" right={<T v="small" color={t.muted}>{cat.poolRulesText}</T>}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.lg }}>
                {cat.pools.map((p, i) => {
                  const pm = matches.filter(m => m.poolId === p.id && m.status !== 'cancelled')
                  return (
                    <Appear key={p.id} delay={stagger(i, 70)} style={{ flexGrow: 1, flexBasis: wide ? 460 : '100%', gap: space.sm }}>
                      <PoolTable pool={p} entries={ctx.entries} qualifiers={cat.format.type === 'pools_bracket' ? cat.format.qualifiers : 0} followed={ctx.followed} />
                      {dense
                        ? <Card pad={0} style={{ overflow: 'hidden' }}>{pm.map(m => <MatchRow key={m.id} m={m} ctx={ctx} />)}</Card>
                        : pm.map(m => <MatchCard key={m.id} m={m} ctx={ctx} />)}
                    </Appear>
                  )
                })}
              </View>
            </Section>
          )
        : null}
    </Screen>
  )
}
