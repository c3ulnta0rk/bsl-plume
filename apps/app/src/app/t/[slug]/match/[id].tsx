import { useLocalSearchParams, useRouter } from 'expo-router'
import { Text, View } from 'react-native'
import { matchStatus, ScoreBoard } from '@/features/match'
import { useTournament } from '@/features/tournament'
import { hhmm, since } from '@/lib/format'
import { Banner, Button, Card, Chip, radius, Row, Screen, space, T, useTheme, useWide } from '@/ui'

/** Un match en plein écran : pensé pour être lu de loin, sur un téléphone ou un écran de salle. */
export default function MatchDetail() {
  const t = useTheme()
  const wide = useWide(700)
  const router = useRouter()
  const { slug, id } = useLocalSearchParams<{ slug: string, id: string }>()
  const { snap, ctx, follows, idx } = useTournament(slug)
  if (!snap) return null
  const m = idx.matches.get(id)
  if (!m) return <Screen maxWidth={560}><Banner tone="danger" text="Match introuvable." /></Screen>
  const cat = ctx.categoryOf.get(m.categoryId)
  const st = matchStatus(m, ctx)
  const court = m.courtId ? ctx.courts.get(m.courtId)?.name : m.estimatedCourtId ? ctx.courts.get(m.estimatedCourtId)?.name : null
  const players = idx.playersOf(m)
  return (
    <Screen maxWidth={860}>
      <Button label="Retour" icon="arrow-back" kind="ghost" size="sm" onPress={() => (router.canGoBack() ? router.back() : router.replace(`/t/${slug}/matchs` as never))} />
      <View style={{ backgroundColor: t.board, borderRadius: radius.lg, padding: wide ? space.xl : space.lg, gap: space.lg, borderWidth: 2, borderColor: m.status === 'playing' ? t.live : t.board }}>
        <Row justify="space-between" wrap>
          <Text style={{ color: t.boardMuted, fontSize: 14, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' }}>{cat?.name} · {m.label} · match n° {m.number}</Text>
          <Chip label={st.label} tone={st.tone} icon={st.icon} />
        </Row>
        <ScoreBoard m={m} ctx={ctx} size={wide ? 'xl' : 'lg'} minSets={m.status === 'pending' ? 1 : 2} />
        <Row wrap gap={space.lg}>
          {court ? <Text style={{ color: '#C9D1F2', fontSize: 15 }}>{m.status === 'pending' ? 'Terrain probable' : 'Terrain'} : <Text style={{ color: '#fff', fontWeight: '800' }}>{court}</Text></Text> : null}
          {m.status === 'pending' && m.estimatedStart ? <Text style={{ color: '#C9D1F2', fontSize: 15 }}>Début estimé : <Text style={{ color: '#fff', fontWeight: '800' }}>{hhmm(m.estimatedStart)}</Text></Text> : null}
          {m.startedAt ? <Text style={{ color: '#C9D1F2', fontSize: 15 }}>Début : <Text style={{ color: '#fff', fontWeight: '800' }}>{hhmm(m.startedAt)}</Text></Text> : null}
          {m.status === 'playing' && m.startedAt ? <Text style={{ color: '#C9D1F2', fontSize: 15 }}>Durée : <Text style={{ color: '#fff', fontWeight: '800' }}>{since(m.startedAt, ctx.now)}</Text></Text> : null}
          {m.endedAt && m.startedAt ? <Text style={{ color: '#C9D1F2', fontSize: 15 }}>Durée : <Text style={{ color: '#fff', fontWeight: '800' }}>{since(m.startedAt, m.endedAt)}</Text></Text> : null}
        </Row>
      </View>
      <Card style={{ gap: 4 }}>
        <T v="h3">Format du match</T>
        <T color={t.ink2}>{m.rulesText}.</T>
        {m.resultType === 'retired' ? <T color={t.warn}>Match terminé sur abandon.</T> : null}
        {m.resultType === 'walkover' ? <T color={t.warn}>Match gagné par forfait.</T> : null}
      </Card>
      {players.length > 0
        ? (
            <Card style={{ gap: space.md }}>
              <T v="h3">Joueurs</T>
              {players.map(p => (
                <Row key={p.id} justify="space-between" wrap>
                  <View style={{ flex: 1, minWidth: 160 }}>
                    <T v="h3">{p.name}</T>
                    {p.club ? <T v="small" color={t.muted}>{p.club}</T> : null}
                  </View>
                  <Row>
                    <Button label="Historique" kind="ghost" size="sm" onPress={() => router.push(`/joueur/${p.id}?t=${slug}` as never)} />
                    <Button
                      label={follows.ids.has(p.id) ? 'Suivi' : 'Suivre'}
                      icon={follows.ids.has(p.id) ? 'star' : 'star-outline'}
                      kind={follows.ids.has(p.id) ? 'accent' : 'secondary'}
                      size="sm"
                      onPress={() => (follows.ids.has(p.id) ? follows.unfollow.mutate(p.id) : follows.follow.mutate({ playerId: p.id }))}
                    />
                  </Row>
                </Row>
              ))}
            </Card>
          )
        : null}
    </Screen>
  )
}
