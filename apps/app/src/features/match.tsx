import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { Pressable, Text, View } from 'react-native'
import { hhmm, inTime, resultSuffix, since } from '@/lib/format'
import type { Category, Court, Entry, Match } from '@/lib/types'
import { Chip, font, Halo, Pop, radius, space, T, useTheme, type Tone } from '@/ui'

export interface MatchContext {
  entries: Map<string, Entry>
  categoryOf: Map<string, Category>
  courts: Map<string, Court>
  slug: string
  now: number
  /** Joueurs suivis sur cet appareil : leurs matchs sont mis en avant. */
  followed?: Set<string>
}

export function sideName(m: Match, side: 1 | 2, ctx: MatchContext): { name: string, known: boolean, withdrawn: boolean } {
  const id = side === 1 ? m.entry1Id : m.entry2Id
  const e = id ? ctx.entries.get(id) : undefined
  if (e) return { name: e.name, known: true, withdrawn: e.withdrawn }
  return { name: (side === 1 ? m.placeholder1 : m.placeholder2) ?? 'À déterminer', known: false, withdrawn: false }
}

/** État d'un match en une étiquette : c'est l'information que tout le monde cherche en premier. */
export function matchStatus(m: Match, ctx: MatchContext): { label: string, tone: Tone, icon?: 'radio-button-on' | 'megaphone' | 'time-outline' | 'checkmark-circle' | 'close-circle' } {
  const court = m.courtId ? ctx.courts.get(m.courtId)?.name : null
  if (m.status === 'playing') return { label: `En jeu${court ? ` · ${court}` : ''}`, tone: 'live', icon: 'radio-button-on' }
  if (m.status === 'called') return { label: `Appelé${court ? ` · ${court}` : ''}`, tone: 'accent', icon: 'megaphone' }
  if (m.status === 'completed') return { label: resultSuffix(m) || 'Terminé', tone: m.resultType === 'normal' ? 'neutral' : 'warn', icon: 'checkmark-circle' }
  if (m.status === 'cancelled') return { label: 'Annulé', tone: 'neutral', icon: 'close-circle' }
  if (m.estimatedStart) return { label: `Vers ${hhmm(m.estimatedStart)} · ${inTime(m.estimatedStart, ctx.now)}`, tone: 'info', icon: 'time-outline' }
  return { label: 'À venir', tone: 'neutral' }
}

function SetBox({ value, won, current, size }: { value: number | null, won: boolean, current: boolean, size: 'md' | 'lg' | 'xl' }) {
  const t = useTheme()
  const dim = size === 'xl' ? { w: 74, h: 84, f: 60 } : size === 'lg' ? { w: 50, h: 54, f: 38 } : { w: 38, h: 42, f: 28 }
  return (
    <Pop watch={`${value}-${won}`} style={{ width: dim.w, height: dim.h, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: current ? t.live : won ? t.volant : t.boardUp }}>
      <Text style={{ fontFamily: font.display, fontSize: dim.f, lineHeight: dim.f + 4, color: current ? '#FFFFFF' : won ? t.volantInk : value === null ? t.boardLine : t.boardText, fontVariant: ['tabular-nums'] }}>
        {value === null ? '·' : value}
      </Text>
    </Pop>
  )
}

/** Tableau de marque : noms et scores en très grand. */
export function ScoreBoard({ m, ctx, size = 'lg', minSets = 2 }: { m: Match, ctx: MatchContext, size?: 'md' | 'lg' | 'xl', minSets?: number }) {
  const t = useTheme()
  const done = m.status === 'completed'
  const live = m.status === 'playing'
  const count = Math.max(m.sets.length, done ? 0 : minSets, 1)
  const nameSize = size === 'xl' ? 30 : size === 'lg' ? 22 : 18
  const line = (side: 1 | 2) => {
    const s = sideName(m, side, ctx)
    const winner = done && m.winnerSide === side
    const loser = done && m.winnerSide !== null && m.winnerSide !== side
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: size === 'xl' ? 92 : size === 'lg' ? 60 : 46 }}>
        <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: winner ? t.volant : 'transparent' }} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={2}
            style={{ fontFamily: font.displayMedium, fontSize: nameSize, lineHeight: nameSize + 3, letterSpacing: 0.2, color: !s.known ? t.boardMuted : loser ? '#B9C2E6' : t.boardText, fontStyle: s.known ? 'normal' : 'italic', textDecorationLine: s.withdrawn ? 'line-through' : 'none' }}
          >{s.name}</Text>
        </View>
        {winner ? <Ionicons name="trophy" size={size === 'md' ? 14 : 18} color={t.volant} /> : null}
        {m.resultType === 'walkover'
          ? <Text style={{ fontFamily: font.display, fontSize: nameSize, color: winner ? t.volant : t.boardMuted }}>{winner ? 'V' : 'WO'}</Text>
          : (
              <View style={{ flexDirection: 'row', gap: size === 'xl' ? 8 : 5 }}>
                {Array.from({ length: count }, (_, i) => {
                  const set = m.sets[i]
                  const mine = set ? (side === 1 ? set.a : set.b) : null
                  const theirs = set ? (side === 1 ? set.b : set.a) : null
                  const current = live && i === m.sets.length - 1
                  const finished = set && !current
                  return <SetBox key={i} value={mine} size={size} current={!!current} won={!!finished && mine !== null && theirs !== null && mine > theirs} />
                })}
              </View>
            )}
      </View>
    )
  }
  return (
    <View style={{ gap: size === 'xl' ? 10 : 6 }}>
      {line(1)}
      <View style={{ height: 1, backgroundColor: t.boardLine }} />
      {line(2)}
    </View>
  )
}

/** Carte de match détaillée : un match par carte, tout est lisible sans plisser les yeux. */
export function MatchCard({ m, ctx, onPress, footer }: { m: Match, ctx: MatchContext, onPress?: () => void, footer?: React.ReactNode }) {
  const t = useTheme()
  const router = useRouter()
  const cat = ctx.categoryOf.get(m.categoryId)
  const st = matchStatus(m, ctx)
  const mine = !!ctx.followed && [m.entry1Id, m.entry2Id].some(id => id && ctx.entries.get(id)?.players.some(p => ctx.followed!.has(p.id)))
  const go = onPress ?? (() => router.push(`/t/${ctx.slug}/match/${m.id}` as never))
  return (
    <Pressable
      testID={`match-${m.number}`}
      accessibilityRole="button"
      accessibilityLabel={`Match ${m.number}, ${sideName(m, 1, ctx).name} contre ${sideName(m, 2, ctx).name}, ${st.label}`}
      onPress={go}
      style={({ pressed }) => ({ backgroundColor: t.board, borderRadius: radius.lg, padding: space.md, gap: space.sm, borderWidth: 2, borderColor: mine ? t.volant : m.status === 'playing' ? t.live : t.board, opacity: pressed ? 0.9 : 1 })}
    >
      {m.status === 'called' ? <Halo color={t.volant} radius={radius.lg} /> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Text style={{ color: t.boardMuted, fontSize: 12, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', flexShrink: 1 }} numberOfLines={1}>
          {cat?.name} · {m.label}
        </Text>
        <View style={{ flex: 1 }} />
        <Pop watch={m.status} scale={1.15}><Chip label={st.label} tone={st.tone} icon={st.icon} small /></Pop>
      </View>
      <ScoreBoard m={m} ctx={ctx} size="lg" />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ color: t.boardMuted, fontSize: 12 }}>Match n° {m.number}</Text>
        {m.status === 'playing' && m.startedAt ? <Text style={{ color: t.boardMuted, fontSize: 12 }}>· depuis {since(m.startedAt, ctx.now)}</Text> : null}
        {m.status === 'completed' && m.endedAt ? <Text style={{ color: t.boardMuted, fontSize: 12 }}>· fini à {hhmm(m.endedAt)}</Text> : null}
        <View style={{ flex: 1 }} />
        {mine ? <Chip label="Suivi" tone="accent" icon="star" small /> : null}
      </View>
      {footer}
    </Pressable>
  )
}

/** Ligne de match condensée : pour parcourir beaucoup de matchs d'un coup d'œil. */
export function MatchRow({ m, ctx, onPress, right }: { m: Match, ctx: MatchContext, onPress?: () => void, right?: React.ReactNode }) {
  const t = useTheme()
  const router = useRouter()
  const st = matchStatus(m, ctx)
  const cat = ctx.categoryOf.get(m.categoryId)
  const go = onPress ?? (() => router.push(`/t/${ctx.slug}/match/${m.id}` as never))
  const done = m.status === 'completed'
  const name = (side: 1 | 2) => {
    const s = sideName(m, side, ctx)
    const win = done && m.winnerSide === side
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text numberOfLines={1} style={{ flex: 1, fontSize: 15, fontWeight: win ? '800' : '500', color: s.known ? t.ink : t.muted, fontStyle: s.known ? 'normal' : 'italic' }}>{s.name}</Text>
        {m.resultType === 'walkover'
          ? <Text style={{ fontFamily: font.display, fontSize: 18, color: win ? t.ink : t.muted }}>{win ? 'V' : 'WO'}</Text>
          : m.sets.map((s2, i) => {
              const a = side === 1 ? s2.a : s2.b
              const b = side === 1 ? s2.b : s2.a
              return <Text key={i} style={{ fontFamily: font.display, fontSize: 20, width: 24, textAlign: 'right', color: a > b ? t.ink : t.muted, fontVariant: ['tabular-nums'] }}>{a}</Text>
            })}
      </View>
    )
  }
  return (
    <Pressable
      testID={`match-${m.number}`}
      accessibilityRole="button"
      accessibilityLabel={`Match ${m.number}, ${sideName(m, 1, ctx).name} contre ${sideName(m, 2, ctx).name}, ${st.label}`}
      onPress={go}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 10, paddingHorizontal: space.md, backgroundColor: pressed ? t.surface2 : t.surface, borderBottomWidth: 1, borderColor: t.line })}
    >
      <View style={{ width: 34, alignItems: 'center' }}>
        <Text style={{ fontFamily: font.display, fontSize: 20, color: t.muted }}>{m.number}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        {name(1)}
        {name(2)}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4, maxWidth: 190 }}>
        <Chip label={st.label} tone={st.tone} icon={st.icon} small />
        <T v="small" color={t.muted} numberOfLines={1} style={{ fontSize: 12 }}>{cat?.name} · {m.label}</T>
      </View>
      {right}
    </Pressable>
  )
}
