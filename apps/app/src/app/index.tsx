import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { Text, View } from 'react-native'
import { get } from '@/lib/api'
import { useFollows } from '@/lib/data'
import { dateFr } from '@/lib/format'
import { useSession } from '@/lib/session'
import type { TournamentCard } from '@/lib/types'
import { Appear, Banner, Button, Card, Chip, Empty, font, Loading, Row, Screen, Section, space, stagger, T, useTheme, useWide } from '@/ui'

function TournamentTile({ t: x, i = 0 }: { t: TournamentCard, i?: number }) {
  const t = useTheme()
  const router = useRouter()
  const live = x.status === 'running'
  return (
    <Appear delay={stagger(i, 70)} style={{ flexGrow: 1, flexBasis: 320 }}><Card testID={`tournament-${x.slug}`} onPress={() => router.push(`/t/${x.slug}` as never)} pad={0} style={{ overflow: 'hidden', flex: 1 }}>
      <View style={{ backgroundColor: live ? t.night : t.surface, padding: space.lg, gap: 6 }}>
        <Row wrap>
          {live ? <Chip label="En direct" tone="live" icon="radio-button-on" /> : x.status === 'finished' ? <Chip label="Terminé" /> : <Chip label={x.registrationOpen ? 'Inscriptions ouvertes' : 'Inscriptions closes'} tone={x.registrationOpen ? 'success' : 'neutral'} />}
        </Row>
        <Text style={{ fontFamily: font.display, fontSize: 30, lineHeight: 32, color: live ? '#FFFFFF' : t.ink }}>{x.name}</Text>
        <Text style={{ color: live ? '#C9D1F2' : t.ink2, fontSize: 15, fontWeight: '600' }}>{dateFr(x.startDate)}</Text>
        <Text style={{ color: live ? '#93A0CF' : t.muted, fontSize: 14 }}>{[x.clubName, x.location].filter(Boolean).join(' · ')}</Text>
      </View>
      <Row style={{ padding: space.md, paddingHorizontal: space.lg, borderTopWidth: 1, borderColor: t.line }} gap={space.lg}>
        <T v="small" color={t.ink2}><T v="h3">{x.categories}</T> tableaux</T>
        <T v="small" color={t.ink2}><T v="h3">{x.entries}</T> / {x.places} inscrits</T>
      </Row>
    </Card></Appear>
  )
}

export default function Home() {
  const t = useTheme()
  const router = useRouter()
  const wide = useWide()
  const { ready } = useSession()
  const follows = useFollows()
  const q = useQuery({ queryKey: ['tournaments'], enabled: ready, queryFn: () => get<TournamentCard[]>('/tournaments'), refetchInterval: 60_000 })
  if (q.isLoading || !ready) return <Loading />
  const list = q.data ?? []
  const running = list.filter(x => x.status === 'running')
  const upcoming = list.filter(x => x.status === 'published').sort((a, b) => a.startDate.localeCompare(b.startDate))
  const past = list.filter(x => x.status === 'finished')
  return (
    <Screen onRefresh={() => void q.refetch()} refreshing={q.isRefetching}>
      <View style={{ backgroundColor: t.night, borderRadius: 20, padding: wide ? space.xxl : space.xl, gap: space.md }}>
        <Text accessibilityRole="header" style={{ fontFamily: font.display, fontSize: wide ? 56 : 40, lineHeight: wide ? 56 : 42, color: '#FFFFFF' }}>
          Vos tournois de badminton,{'\n'}<Text style={{ color: t.volant }}>en direct et sans attente inutile.</Text>
        </Text>
        <Text style={{ color: '#C9D1F2', fontSize: 17, lineHeight: 25, maxWidth: 640 }}>
          Inscrivez-vous en ligne, suivez un joueur, sachez à quelle heure vous jouez et sur quel terrain. Côté organisation : tirages, terrains, scores et imprévus au même endroit.
        </Text>
        <Row wrap gap={space.md}>
          <Button label="Organiser un tournoi" kind="accent" icon="add-circle" size="lg" onPress={() => router.push('/orga' as never)} />
        </Row>
      </View>
      {q.isError ? <Banner tone="danger" icon="cloud-offline" text="Impossible de charger les tournois. Vérifiez votre connexion puis réessayez." action={<Button label="Réessayer" size="sm" kind="secondary" onPress={() => void q.refetch()} />} /> : null}
      {follows.list.length > 0
        ? (
            <Section title="Joueurs suivis">
              <Row wrap>
                {follows.list.map(f => <Button key={f.playerId} label={f.name} kind="secondary" icon={f.isMe ? 'person' : 'star'} onPress={() => router.push(`/joueur/${f.playerId}` as never)} />)}
              </Row>
            </Section>
          )
        : null}
      {running.length > 0 ? <Section title="En ce moment"><Row wrap gap={space.lg} align="stretch">{running.map((x, i) => <TournamentTile key={x.id} t={x} i={i} />)}</Row></Section> : null}
      <Section title="À venir">
        {upcoming.length === 0
          ? <Empty icon="calendar-outline" title="Aucun tournoi à venir" text="Les prochains tournois publiés apparaîtront ici." />
          : <Row wrap gap={space.lg} align="stretch">{upcoming.map((x, i) => <TournamentTile key={x.id} t={x} i={i + 1} />)}</Row>}
      </Section>
      {past.length > 0 ? <Section title="Terminés"><Row wrap gap={space.lg} align="stretch">{past.map((x, i) => <TournamentTile key={x.id} t={x} i={i + 2} />)}</Row></Section> : null}
    </Screen>
  )
}
