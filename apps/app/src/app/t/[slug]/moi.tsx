import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { MatchCard, sideName, type MatchContext } from '@/features/match'
import { PlayerPicker } from '@/features/player-pick'
import { useTournament } from '@/features/tournament'
import { useNotifications } from '@/lib/data'
import { hhmm, inTime } from '@/lib/format'
import { disablePush, enablePush, pushState, type PushState } from '@/lib/push'
import type { Follow, Match, Snapshot } from '@/lib/types'
import { Banner, Button, Card, Chip, Empty, font, radius, Row, Screen, Section, space, T, useTheme, useWide } from '@/ui'

/** Le prochain rendez-vous d'un joueur, en très gros : terrain, heure, temps libre. */
function NextUp({ f, snap, ctx, matches }: { f: Follow, snap: Snapshot, ctx: MatchContext, matches: Match[] }) {
  const t = useTheme()
  const router = useRouter()
  const live = matches.find(m => m.status === 'playing' || m.status === 'called')
  const next = matches.filter(m => m.status === 'pending').sort((a, b) => (a.estimatedStart ?? Infinity) - (b.estimatedStart ?? Infinity) || a.number - b.number)[0]
  const m = live ?? next
  const done = matches.filter(x => x.status === 'completed')
  const head = (
    <Row justify="space-between">
      <Row>
        <Chip label={f.isMe ? 'Moi' : 'Suivi'} tone="accent" icon={f.isMe ? 'person' : 'star'} small />
        <Text style={{ fontFamily: font.display, fontSize: 24, color: '#FFFFFF' }}>{f.name}</Text>
      </Row>
      <Button label="Historique" kind="secondary" size="sm" onPress={() => router.push(`/joueur/${f.playerId}?t=${snap.tournament.slug}` as never)} />
    </Row>
  )
  const box = (children: React.ReactNode, border: string) => (
    <View testID={`next-${f.playerId}`} style={{ backgroundColor: t.board, borderRadius: radius.lg, padding: space.lg, gap: space.md, borderWidth: 2, borderColor: border }}>{head}{children}</View>
  )
  if (!m) {
    const any = matches.length > 0
    return box(
      <Text style={{ color: '#C9D1F2', fontSize: 17, lineHeight: 24 }}>
        {any ? (snap.tournament.status === 'finished' || done.length === matches.length ? 'Plus de match prévu. Résultats ci-dessous.' : 'En attente du prochain adversaire.') : 'Pas encore de match : le tirage au sort n\'est pas fait.'}
      </Text>, t.board)
  }
  const me = [1, 2].find(s => ctx.entries.get((s === 1 ? m.entry1Id : m.entry2Id) ?? '')?.players.some(p => p.id === f.playerId)) as 1 | 2 | undefined
  const opp = sideName(m, me === 1 ? 2 : 1, ctx)
  const court = m.courtId ? ctx.courts.get(m.courtId)?.name : null
  const cat = ctx.categoryOf.get(m.categoryId)
  if (m.status === 'called' || m.status === 'playing') {
    return box(
      <>
        <View style={{ backgroundColor: m.status === 'called' ? t.volant : t.live, borderRadius: radius.md, padding: space.lg, gap: 2 }}>
          <Text style={{ color: m.status === 'called' ? t.volantInk : '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' }}>{m.status === 'called' ? 'Match appelé, présentez-vous' : 'Match en cours'}</Text>
          <Text style={{ fontFamily: font.display, fontSize: 64, lineHeight: 66, color: m.status === 'called' ? t.volantInk : '#fff' }}>{court ?? 'Terrain'}</Text>
        </View>
        <Text style={{ color: '#C9D1F2', fontSize: 17 }}>Contre <Text style={{ color: '#fff', fontWeight: '800' }}>{opp.name}</Text> · {cat?.name}</Text>
      </>, m.status === 'called' ? t.volant : t.live)
  }
  const min = m.estimatedStart ? Math.round((m.estimatedStart - ctx.now) / 60_000) : null
  const known = !!(m.entry1Id && m.entry2Id)
  return box(
    <>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.lg, flexWrap: 'wrap' }}>
        <View>
          <Text style={{ color: t.boardMuted, fontSize: 13, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' }}>Prochain match, heure estimée</Text>
          <Text style={{ fontFamily: font.display, fontSize: 72, lineHeight: 74, color: '#FFFFFF', fontVariant: ['tabular-nums'] }}>{m.estimatedStart ? hhmm(m.estimatedStart) : '--:--'}</Text>
        </View>
        {m.estimatedStart ? <View style={{ paddingBottom: 12 }}><Chip label={inTime(m.estimatedStart, ctx.now)} tone={min !== null && min <= 15 ? 'accent' : 'info'} icon="time-outline" /></View> : null}
      </View>
      <Text style={{ color: '#C9D1F2', fontSize: 17, lineHeight: 24 }}>
        Contre <Text style={{ color: '#fff', fontWeight: '800', fontStyle: opp.known ? 'normal' : 'italic' }}>{opp.name}</Text> · {cat?.name}, {m.label}
      </Text>
      <Text style={{ color: min !== null && min <= 15 ? t.volant : t.boardMuted, fontSize: 15, lineHeight: 21, fontWeight: '600' }}>
        {min === null
          ? 'Heure non estimée pour le moment.'
          : min <= 15
            ? 'Restez près des terrains, l\'appel est proche.'
            : min >= 45
              ? `Vous avez environ ${inTime(m.estimatedStart!, ctx.now).replace('dans ', '')} devant vous. L'heure s'ajuste en direct selon l'avancement.`
              : 'L\'heure s\'ajuste en direct selon l\'avancement des terrains.'}
        {!known ? ' L\'adversaire dépend des matchs en cours.' : ''}
      </Text>
    </>, t.board)
}

export default function Mine() {
  const t = useTheme()
  const wide = useWide()
  const router = useRouter()
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const { snap, ctx, idx, follows, q } = useTournament(slug)
  const notes = useNotifications()
  const [push, setPush] = useState<PushState>('off')
  const [mode, setMode] = useState<'me' | 'fan' | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => { void pushState().then(setPush) }, [])
  if (!snap) return null
  const here = follows.list.filter(f => idx.matchesOfPlayer(f.playerId).length > 0 || snap.categories.some(c => c.entries.some(e => e.players.some(p => p.id === f.playerId))))
  const adding = mode !== null || here.length === 0

  const togglePush = async () => {
    setBusy(true)
    try {
      if (push === 'on') { await disablePush(); setPush('off') } else setPush(await enablePush())
    } finally { setBusy(false) }
  }
  const recent = (notes.data ?? []).slice(0, 5)

  return (
    <Screen maxWidth={900} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}>
      {here.length > 0
        ? (
            <>
              <View style={{ gap: space.md }}>
                {here.map(f => <NextUp key={f.playerId} f={f} snap={snap} ctx={ctx} matches={idx.matchesOfPlayer(f.playerId)} />)}
              </View>
              <Card style={{ gap: space.md }}>
                <Row justify="space-between" wrap>
                  <View style={{ flex: 1, minWidth: 220, gap: 2 }}>
                    <T v="h3">Notifications sur cet appareil</T>
                    <T v="small" color={t.ink2}>
                      {push === 'on' ? 'Activées : vous serez prévenu à l\'appel du match et une dizaine de minutes avant.'
                        : push === 'denied' ? 'Bloquées par votre navigateur ou votre téléphone. Autorisez-les dans les réglages du site.'
                          : push === 'unsupported' ? 'Indisponibles sur ce navigateur. Sur iPhone, ajoutez d\'abord le site à l\'écran d\'accueil. Les alertes s\'affichent quand même ici tant que la page reste ouverte.'
                            : 'Recevez un message à l\'appel du match et quand il approche, même téléphone verrouillé.'}
                    </T>
                  </View>
                  {push === 'on' || push === 'off' ? <Button label={push === 'on' ? 'Désactiver' : 'Activer'} kind={push === 'on' ? 'secondary' : 'primary'} icon={push === 'on' ? 'notifications-off-outline' : 'notifications'} loading={busy} onPress={() => void togglePush()} testID="push-toggle" /> : null}
                </Row>
              </Card>
              {recent.length > 0
                ? (
                    <Section title="Dernières alertes">
                      <Card pad={0} style={{ overflow: 'hidden' }}>
                        {recent.map((n, i) => (
                          <View key={n.id} style={{ padding: space.md, borderBottomWidth: i === recent.length - 1 ? 0 : 1, borderColor: t.line }}>
                            <Row justify="space-between"><T v="h3">{n.title}</T><T v="small" color={t.muted}>{hhmm(Date.parse(n.createdAt))}</T></Row>
                            <T v="small" color={t.ink2}>{n.body}</T>
                          </View>
                        ))}
                      </Card>
                    </Section>
                  )
                : null}
              {here.map((f) => {
                const ms = idx.matchesOfPlayer(f.playerId).filter(m => m.status !== 'cancelled').sort((a, b) => a.number - b.number)
                if (ms.length === 0) return null
                return (
                  <Section key={f.playerId} title={`Matchs de ${f.name}`} right={<Button label="Ne plus suivre" kind="ghost" size="sm" onPress={() => follows.unfollow.mutate(f.playerId)} />}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
                      {ms.map(m => <View key={m.id} style={{ flexGrow: 1, flexBasis: wide ? 380 : '100%' }}><MatchCard m={m} ctx={ctx} /></View>)}
                    </View>
                  </Section>
                )
              })}
            </>
          )
        : null}

      {adding
        ? (
            <Card style={{ gap: space.lg }}>
              {mode === null
                ? (
                    <>
                      <View style={{ gap: 4 }}>
                        <T v="title" accessibilityRole="header">Bienvenue au {snap.tournament.name}</T>
                        <T color={t.ink2}>Dites-nous pourquoi vous êtes là : l'écran s'adapte, sans créer de compte.</T>
                      </View>
                      <Button label="Je joue dans ce tournoi" icon="person" size="lg" full onPress={() => setMode('me')} testID="choose-me" />
                      <Button label="Je viens suivre un joueur" icon="star" size="lg" kind="night" full onPress={() => setMode('fan')} testID="choose-fan" />
                      <Button label="Je regarde seulement" icon="eye-outline" size="lg" kind="secondary" full onPress={() => router.replace(`/t/${snap.tournament.slug}/matchs` as never)} />
                    </>
                  )
                : (
                    <>
                      <Row justify="space-between">
                        <T v="title">{mode === 'me' ? 'Qui êtes-vous ?' : 'Qui voulez-vous suivre ?'}</T>
                        <Button label="Retour" kind="ghost" size="sm" onPress={() => setMode(null)} />
                      </Row>
                      {follows.follow.isError ? <Banner tone="danger" text={(follows.follow.error as Error).message} /> : null}
                      <PlayerPicker
                        snap={snap}
                        selected={follows.ids}
                        actionIcon="add-circle-outline"
                        selectedIcon="checkmark-circle"
                        onPick={(p) => {
                          if (follows.ids.has(p.id)) follows.unfollow.mutate(p.id)
                          else follows.follow.mutate({ playerId: p.id, isMe: mode === 'me' }, { onSuccess: () => { if (mode === 'me') setMode(null) } })
                        }}
                      />
                      {mode === 'fan' && here.length > 0 ? <Button label="Terminé" icon="checkmark" full size="lg" onPress={() => setMode(null)} testID="follow-done" /> : null}
                    </>
                  )}
            </Card>
          )
        : <Button label="Suivre un autre joueur" icon="add" kind="secondary" onPress={() => setMode('fan')} testID="follow-more" />}
      {here.length === 0 && follows.list.length > 0 && mode === null ? <Empty icon="star-outline" title="Aucun de vos joueurs suivis ne participe à ce tournoi" /> : null}
    </Screen>
  )
}
