import { useRouter } from 'expo-router'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { hhmm } from '@/lib/format'
import type { Category, Match } from '@/lib/types'
import { font, radius, T, useTheme } from '@/ui'
import { sideName, type MatchContext } from './match'

const CARD_H = 92
const GAP = 14
const COL_W = 236

function Node({ m, ctx, onPress }: { m: Match | undefined, ctx: MatchContext, onPress?: (m: Match) => void }) {
  const t = useTheme()
  const router = useRouter()
  if (!m) {
    // exemption : la place existe dans le tableau mais aucun match n'est joué
    return <View style={{ height: CARD_H, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.line, alignItems: 'center', justifyContent: 'center' }}><T v="small" color={t.muted}>Exempt</T></View>
  }
  const live = m.status === 'playing' || m.status === 'called'
  const mine = !!ctx.followed && [m.entry1Id, m.entry2Id].some(id => id && ctx.entries.get(id)?.players.some(p => ctx.followed!.has(p.id)))
  const line = (side: 1 | 2) => {
    const s = sideName(m, side, ctx)
    const win = m.status === 'completed' && m.winnerSide === side
    return (
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 6, backgroundColor: win ? t.boardUp : 'transparent' }}>
        <Text numberOfLines={1} style={{ flex: 1, fontSize: 14, fontWeight: win ? '800' : '500', color: !s.known ? t.boardMuted : win ? t.volant : t.boardText, fontStyle: s.known ? 'normal' : 'italic' }}>{s.name}</Text>
        {m.resultType === 'walkover'
          ? <Text style={{ fontFamily: font.display, fontSize: 17, color: win ? t.volant : t.boardMuted }}>{win ? 'V' : 'WO'}</Text>
          : m.sets.map((x, i) => <Text key={i} style={{ fontFamily: font.display, fontSize: 19, width: 21, textAlign: 'right', color: (side === 1 ? x.a > x.b : x.b > x.a) ? t.boardText : t.boardMuted, fontVariant: ['tabular-nums'] }}>{side === 1 ? x.a : x.b}</Text>)}
      </View>
    )
  }
  const court = m.courtId ? ctx.courts.get(m.courtId)?.name : null
  const info = m.status === 'playing' ? `En jeu${court ? ` · ${court}` : ''}` : m.status === 'called' ? `Appelé${court ? ` · ${court}` : ''}` : m.status === 'pending' && m.estimatedStart ? `Vers ${hhmm(m.estimatedStart)}` : m.resultType === 'retired' ? 'Abandon' : ''
  return (
    <Pressable
      testID={`bracket-match-${m.number}`}
      accessibilityRole="button"
      accessibilityLabel={`Match ${m.number}, ${sideName(m, 1, ctx).name} contre ${sideName(m, 2, ctx).name}`}
      onPress={() => (onPress ? onPress(m) : router.push(`/t/${ctx.slug}/match/${m.id}` as never))}
      style={{ height: CARD_H, borderRadius: radius.md, backgroundColor: t.board, overflow: 'hidden', borderWidth: 2, borderColor: mine ? t.volant : live ? t.live : t.board }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10, paddingTop: 5, height: 22 }}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: t.boardMuted }}>N° {m.number}</Text>
        <Text style={{ fontSize: 11, fontWeight: '800', color: live ? '#FF8E9A' : t.boardMuted }}>{info}</Text>
      </View>
      {line(1)}
      <View style={{ height: 1, backgroundColor: t.boardLine }} />
      {line(2)}
    </Pressable>
  )
}

/** Tableau à élimination directe, défilant horizontalement, avec ses traits de liaison. */
export function BracketView({ category, matches, ctx, onPress }: { category: Category, matches: Match[], ctx: MatchContext, onPress?: (m: Match) => void }) {
  const t = useTheme()
  const rounds = category.bracketRounds
  if (rounds.length === 0) return null
  const main = matches.filter(m => m.phase === 'bracket' && !m.thirdPlace)
  const third = matches.find(m => m.thirdPlace)
  const firstCount = 2 ** (rounds.length - 1)
  const height = firstCount * (CARD_H + GAP)
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ paddingBottom: 12 }}>
      <View style={{ flexDirection: 'row' }}>
        {rounds.map((r, ri) => {
          const count = firstCount / 2 ** ri
          const slot = height / count
          return (
            <View key={r.round} style={{ width: COL_W + (ri < rounds.length - 1 ? 28 : 0) }}>
              <Text style={{ fontFamily: font.display, fontSize: 20, color: t.ink, marginBottom: 8, letterSpacing: 0.3 }}>{r.name}</Text>
              <View style={{ height }}>
                {Array.from({ length: count }, (_, i) => {
                  const m = main.find(x => x.round === r.round && x.position === i + 1)
                  const top = i * slot + (slot - CARD_H) / 2
                  return (
                    <View key={i} style={{ position: 'absolute', top, left: 0, width: COL_W }}>
                      <Node m={m} ctx={ctx} onPress={onPress} />
                      {ri < rounds.length - 1
                        ? (
                            <>
                              <View style={{ position: 'absolute', left: COL_W, top: CARD_H / 2 - 1, width: 14, height: 2, backgroundColor: t.line }} />
                              <View style={{ position: 'absolute', left: COL_W + 14, width: 2, backgroundColor: t.line, ...(i % 2 === 0 ? { top: CARD_H / 2 - 1, height: slot / 2 + 1 } : { top: CARD_H / 2 - slot / 2, height: slot / 2 + 1 }) }} />
                              {i % 2 === 0 ? <View style={{ position: 'absolute', left: COL_W + 14, top: CARD_H / 2 + slot / 2 - 1, width: 14, height: 2, backgroundColor: t.line }} /> : null}
                            </>
                          )
                        : null}
                    </View>
                  )
                })}
              </View>
              {ri === rounds.length - 1 && third
                ? (
                    <View style={{ width: COL_W, marginTop: 4 }}>
                      <Text style={{ fontFamily: font.display, fontSize: 18, color: t.ink, marginBottom: 6 }}>3e place</Text>
                      <Node m={third} ctx={ctx} onPress={onPress} />
                    </View>
                  )
                : null}
            </View>
          )
        })}
      </View>
    </ScrollView>
  )
}
