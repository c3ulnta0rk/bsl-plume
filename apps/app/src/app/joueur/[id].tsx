import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Text, View } from 'react-native'
import { get } from '@/lib/api'
import { useFollows } from '@/lib/data'
import { dateFr } from '@/lib/format'
import { useSession } from '@/lib/session'
import type { PlayerHistory } from '@/lib/types'
import { Appear, Banner, Button, Card, Chip, CountUp, Empty, font, Loading, radius, Row, Screen, Section, space, stagger, T, useTheme } from '@/ui'

/** Fiche d'un joueur : son parcours tournoi par tournoi. */
export default function Player() {
  const t = useTheme()
  const router = useRouter()
  const { id, t: from } = useLocalSearchParams<{ id: string, t?: string }>()
  const { ready } = useSession()
  const follows = useFollows()
  const q = useQuery({ queryKey: ['player', id], enabled: ready && !!id, queryFn: () => get<PlayerHistory>(`/players/${id}`) })
  if (q.isLoading || !ready) return <Loading />
  if (!q.data) return <Screen maxWidth={560}><Banner tone="danger" text={(q.error as Error | null)?.message ?? 'Joueur introuvable.'} /></Screen>
  const { player, stats, tournaments } = q.data
  const on = follows.ids.has(player.id)
  const rate = stats.played ? Math.round((stats.won / stats.played) * 100) : null
  const stat = (value: number | null, label: string, suffix = '') => (
    <View style={{ flexGrow: 1, flexBasis: 90, backgroundColor: t.boardUp, borderRadius: radius.md, padding: space.md }}>
      {value === null ? <Text style={{ fontFamily: font.display, fontSize: 38, lineHeight: 40, color: '#FFFFFF' }}>–</Text> : <CountUp value={value} suffix={suffix} style={{ fontFamily: font.display, fontSize: 38, lineHeight: 40, color: '#FFFFFF' }} />}
      <Text style={{ color: t.boardMuted, fontSize: 12, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' }}>{label}</Text>
    </View>
  )
  return (
    <Screen maxWidth={860}>
      <Button label="Retour" icon="arrow-back" kind="ghost" size="sm" onPress={() => (router.canGoBack() ? router.back() : router.replace((from ? `/t/${from}/joueurs` : '/') as never))} />
      <View style={{ backgroundColor: t.board, borderRadius: radius.lg, padding: space.lg, gap: space.md }}>
        <Row justify="space-between" wrap>
          <View style={{ flex: 1, minWidth: 200 }}>
            <Text accessibilityRole="header" style={{ fontFamily: font.display, fontSize: 38, lineHeight: 40, color: '#FFFFFF' }}>{player.name}</Text>
            {player.club ? <Text style={{ color: '#C9D1F2', fontSize: 16 }}>{player.club}</Text> : null}
          </View>
          <Button label={on ? 'Suivi' : 'Suivre'} icon={on ? 'star' : 'star-outline'} kind={on ? 'accent' : 'secondary'} onPress={() => (on ? follows.unfollow.mutate(player.id) : follows.follow.mutate({ playerId: player.id }))} testID="follow-player" />
        </Row>
        <Row gap={space.sm} wrap>
          {stat(tournaments.length, 'Tournois')}
          {stat(stats.played, 'Matchs')}
          {stat(stats.won, 'Victoires')}
          {stat(rate, 'Réussite', ' %')}
        </Row>
      </View>
      {tournaments.length === 0
        ? <Empty icon="time-outline" title="Pas encore d'historique" text="Les résultats de ce joueur apparaîtront ici après ses premiers matchs." />
        : tournaments.map((tr, i) => (
            <Appear key={tr.slug} delay={stagger(i + 1, 90)} style={{ gap: 12 }}><Section title={tr.name} right={<Button label="Voir le tournoi" kind="ghost" size="sm" onPress={() => router.push(`/t/${tr.slug}` as never)} />}>
              <T v="small" color={t.muted} style={{ marginTop: -8 }}>{dateFr(tr.date)}{tr.location ? ` · ${tr.location}` : ''}</T>
              {tr.categories.map(c => (
                <Card key={c.id} pad={0} style={{ overflow: 'hidden' }}>
                  <Row justify="space-between" wrap style={{ padding: space.md, backgroundColor: t.surface2 }}>
                    <View style={{ flex: 1, minWidth: 160 }}>
                      <T v="h3">{c.name}</T>
                      {c.partner ? <T v="small" color={t.ink2}>avec {c.partner}</T> : null}
                    </View>
                    <Chip label={c.result} tone={c.result === 'Vainqueur' ? 'accent' : c.result === 'Finaliste' || c.result === '3e' ? 'info' : c.result === 'Forfait' ? 'warn' : 'neutral'} icon={c.result === 'Vainqueur' ? 'trophy' : undefined} />
                  </Row>
                  {c.matches.length === 0
                    ? <T v="small" color={t.muted} style={{ padding: space.md }}>Aucun match pour le moment.</T>
                    : c.matches.map((m, i) => (
                        <Row key={m.id} style={{ paddingHorizontal: space.md, minHeight: 52, borderTopWidth: i === 0 ? 0 : 1, borderColor: t.line }} gap={space.md}>
                          <View style={{ width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: m.won === null ? t.surface2 : m.won ? t.successBg : t.dangerBg }}>
                            <Text style={{ fontWeight: '800', fontSize: 13, color: m.won === null ? t.muted : m.won ? t.success : t.danger }}>{m.won === null ? '·' : m.won ? 'V' : 'D'}</Text>
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <T v="small" style={{ fontWeight: '700' }} numberOfLines={1}>{m.opponent}</T>
                            <T v="small" color={t.muted} style={{ fontSize: 12 }}>{m.label}</T>
                          </View>
                          <Text style={{ fontFamily: font.display, fontSize: 21, color: t.ink, fontVariant: ['tabular-nums'] }}>
                            {m.resultType === 'walkover' ? 'Forfait' : m.won === null ? 'À jouer' : m.sets.map(s => `${s.a}-${s.b}`).join('  ') + (m.resultType === 'retired' ? '  ab.' : '')}
                          </Text>
                        </Row>
                      ))}
                </Card>
              ))}
            </Section></Appear>
          ))}
    </Screen>
  )
}
