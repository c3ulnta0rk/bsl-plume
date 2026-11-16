import { ScrollView, Text, View } from 'react-native'
import type { Category, Entry } from '@/lib/types'
import { Chip, font, radius, Row, space, T, useTheme } from '@/ui'

type Pool = Category['pools'][number]

/** Classement d'une poule. Les qualifiés sont surlignés. */
export function PoolTable({ pool, entries, qualifiers, followed }: { pool: Pool, entries: Map<string, Entry>, qualifiers: number, followed?: Set<string> }) {
  const t = useTheme()
  const head = (label: string, w: number) => <Text style={{ width: w, textAlign: 'center', fontSize: 11, fontWeight: '800', color: t.muted, letterSpacing: 0.5 }}>{label}</Text>
  const cell = (v: string | number, w: number, strong = false) => <Text style={{ width: w, textAlign: 'center', fontFamily: font.display, fontSize: strong ? 24 : 19, color: strong ? t.ink : t.ink2, fontVariant: ['tabular-nums'] }}>{v}</Text>
  const anyLot = pool.standings.some(r => r.tiedByLot)
  return (
    <View testID={`pool-${pool.name}`} style={{ backgroundColor: t.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: t.line, overflow: 'hidden' }}>
      <Row justify="space-between" style={{ padding: space.md, backgroundColor: t.night }}>
        <Text style={{ fontFamily: font.display, fontSize: 24, color: '#FFFFFF', letterSpacing: 0.3 }}>{pool.name}</Text>
        {pool.complete ? <Chip label="Terminée" tone="accent" small /> : null}
      </Row>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ minWidth: '100%' }}>
        <View style={{ flex: 1, minWidth: 330 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.md, paddingVertical: 8, borderBottomWidth: 1, borderColor: t.line }}>
            <Text style={{ width: 30, fontSize: 11, fontWeight: '800', color: t.muted }}>#</Text>
            <Text style={{ flex: 1, fontSize: 11, fontWeight: '800', color: t.muted, letterSpacing: 0.5 }}>JOUEUR</Text>
            {head('J', 30)}{head('V', 34)}{head('SETS', 52)}{head('POINTS', 70)}
          </View>
          {pool.standings.map((r, i) => {
            const e = entries.get(r.id)
            const q = i < qualifiers && !r.withdrawn && qualifiers > 0
            const mine = !!followed && !!e?.players.some(p => followed.has(p.id))
            return (
              <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.md, minHeight: 52, borderBottomWidth: i === pool.standings.length - 1 ? 0 : 1, borderColor: t.line, backgroundColor: mine ? t.actionSoft : 'transparent' }}>
                <View style={{ width: 30 }}>
                  <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: q && pool.complete ? t.volant : q ? t.surface2 : 'transparent' }}>
                    <Text style={{ fontFamily: font.display, fontSize: 17, color: q && pool.complete ? t.volantInk : t.ink }}>{r.withdrawn ? '–' : r.rank}</Text>
                  </View>
                </View>
                <View style={{ flex: 1, minWidth: 0, paddingVertical: 6 }}>
                  <Text numberOfLines={2} style={{ fontSize: 15, fontWeight: '700', color: r.withdrawn ? t.muted : t.ink, textDecorationLine: r.withdrawn ? 'line-through' : 'none' }}>{e?.name ?? '?'}</Text>
                  {r.withdrawn ? <Text style={{ fontSize: 12, color: t.warn }}>Forfait</Text> : e?.players[0]?.club ? <Text numberOfLines={1} style={{ fontSize: 12, color: t.muted }}>{[...new Set(e.players.map(p => p.club).filter(Boolean))].join(' / ')}</Text> : null}
                </View>
                {cell(r.played, 30)}{cell(r.won, 34, true)}{cell(`${r.setsFor}-${r.setsAgainst}`, 52)}{cell(`${r.pointsFor}-${r.pointsAgainst}`, 70)}
              </View>
            )
          })}
        </View>
      </ScrollView>
      {anyLot ? <T v="small" color={t.warn} style={{ padding: space.md, paddingTop: 0 }}>Égalité parfaite : classement départagé par tirage au sort.</T> : null}
    </View>
  )
}
