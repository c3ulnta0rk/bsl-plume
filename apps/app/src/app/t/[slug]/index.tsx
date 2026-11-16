import { useLocalSearchParams, useRouter } from 'expo-router'
import { Text, View } from 'react-native'
import { MatchCard } from '@/features/match'
import { useTournament } from '@/features/tournament'
import { dateFr, DISCIPLINES } from '@/lib/format'
import { Banner, Button, Card, Chip, Empty, font, radius, Row, Screen, Section, space, T, useTheme, useWide } from '@/ui'

export default function Overview() {
  const t = useTheme()
  const wide = useWide()
  const router = useRouter()
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const { snap, ctx, q, follows } = useTournament(slug)
  if (!snap) return null
  const x = snap.tournament
  const base = `/t/${x.slug}`
  const onCourt = snap.courts.map(c => ({ c, m: c.matchId ? snap.matches.find(m => m.id === c.matchId) : undefined }))
  const next = snap.matches.filter(m => m.status === 'pending' && m.entry1Id && m.entry2Id && m.estimatedStart).sort((a, b) => a.estimatedStart! - b.estimatedStart!).slice(0, wide ? 6 : 3)
  const done = snap.matches.filter(m => m.status === 'completed').length
  const total = snap.matches.filter(m => m.status !== 'cancelled').length
  const paused = x.settings.pausedUntil && Date.parse(x.settings.pausedUntil) > ctx.now
  return (
    <Screen onRefresh={() => void q.refetch()} refreshing={q.isRefetching}>
      {paused ? <Banner tone="warn" icon="pause-circle" text={`Pause en cours. Reprise des matchs prévue à ${new Date(x.settings.pausedUntil!).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.`} /> : null}
      {x.status !== 'finished' && follows.list.length === 0
        ? (
            <Card style={{ gap: space.md, backgroundColor: t.volant, borderColor: t.volant }}>
              <Text style={{ fontFamily: font.display, fontSize: 28, lineHeight: 30, color: t.volantInk }}>Vous jouez, ou vous venez voir quelqu'un ?</Text>
              <Text style={{ color: t.volantInk, fontSize: 16, lineHeight: 22 }}>Choisissez un joueur : vous saurez à quelle heure il joue, sur quel terrain, et vous serez prévenu à l'appel du match.</Text>
              <Button label="Choisir un joueur" kind="night" icon="star" size="lg" onPress={() => router.push(`${base}/moi` as never)} testID="cta-follow" />
            </Card>
          )
        : null}

      {x.status === 'running'
        ? (
            <>
              <Section title="Sur les terrains" right={total ? <Chip label={`${done} / ${total} matchs joués`} tone="info" /> : undefined}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
                  {onCourt.map(({ c, m }) => (
                    <View key={c.id} style={{ flexGrow: 1, flexBasis: wide ? 340 : '100%', gap: 6 }}>
                      <Row>
                        <Text style={{ fontFamily: font.display, fontSize: 22, color: t.ink }}>{c.name}</Text>
                        {!c.open ? <Chip label="Fermé" tone="warn" small /> : null}
                      </Row>
                      {m
                        ? <MatchCard m={m} ctx={ctx} />
                        : <View style={{ borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.line, minHeight: 120, alignItems: 'center', justifyContent: 'center' }}><T v="small" color={t.muted}>{c.open ? 'Terrain libre' : 'Terrain fermé'}</T></View>}
                    </View>
                  ))}
                </View>
              </Section>
              {next.length > 0
                ? (
                    <Section title="À suivre" right={<Button label="Tous les matchs" kind="ghost" size="sm" icon="arrow-forward" onPress={() => router.replace(`${base}/matchs` as never)} />}>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
                        {next.map(m => <View key={m.id} style={{ flexGrow: 1, flexBasis: wide ? 340 : '100%' }}><MatchCard m={m} ctx={ctx} /></View>)}
                      </View>
                    </Section>
                  )
                : null}
            </>
          )
        : null}

      <Section title="Tableaux et places">
        {snap.categories.length === 0
          ? <Empty title="Les tableaux ne sont pas encore annoncés" />
          : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
                {snap.categories.map((c) => {
                  const ratio = Math.min(1, c.counts.accepted / Math.max(1, c.maxEntries))
                  const full = c.counts.accepted >= c.maxEntries
                  return (
                    <Card key={c.id} style={{ flexGrow: 1, flexBasis: 300, gap: 8 }} onPress={() => router.replace(`${base}/tableaux?c=${c.id}` as never)}>
                      <Row justify="space-between">
                        <T v="h2">{c.name}</T>
                        {c.status === 'finished' ? <Chip label="Terminé" small /> : c.status === 'drawn' ? <Chip label="Tirage fait" tone="info" small /> : full ? <Chip label="Complet" tone="warn" small /> : <Chip label={`${c.maxEntries - c.counts.accepted} places`} tone="success" small />}
                      </Row>
                      <T v="small" color={t.ink2}>{DISCIPLINES[c.discipline]}{c.level ? ` · ${c.level}` : ''}</T>
                      <View style={{ height: 8, borderRadius: 4, backgroundColor: t.surface2, overflow: 'hidden' }}>
                        <View style={{ width: `${ratio * 100}%`, height: 8, backgroundColor: full ? t.warn : t.action }} />
                      </View>
                      <T v="small" color={t.ink2}><T v="h3">{c.counts.accepted}</T> / {c.maxEntries} {c.discipline.startsWith('D') ? 'paires' : 'joueurs'}{c.counts.waitlist ? ` · ${c.counts.waitlist} en attente` : ''}</T>
                    </Card>
                  )
                })}
              </View>
            )}
        {x.registrationOpen && x.status !== 'finished'
          ? (
              <Row wrap>
                <Button label="S'inscrire au tournoi" icon="create" size="lg" onPress={() => router.replace(`${base}/inscription` as never)} testID="cta-register" />
                {x.settings.registrationDeadline ? <T v="small" color={t.ink2}>Jusqu'au {dateFr(x.settings.registrationDeadline, false)}</T> : null}
              </Row>
            )
          : null}
      </Section>

      <Section title="Règles du jeu">
        <Card style={{ gap: space.md }}>
          {snap.categories.map(c => (
            <View key={c.id} style={{ gap: 2 }}>
              <T v="h3">{c.name}</T>
              <T v="small" color={t.ink2}>
                {c.format.type === 'bracket' ? 'Élimination directe' : c.format.type === 'pools' ? `Poules de ${c.format.poolSize}` : `Poules de ${c.format.poolSize}, ${c.format.qualifiers} qualifié${c.format.qualifiers > 1 ? 's' : ''} par poule, puis tableau final`}
                {c.format.thirdPlace && c.format.type !== 'pools' ? ', avec match pour la 3e place' : ''}.
              </T>
              {c.format.type !== 'bracket' ? <T v="small" color={t.ink2}>Poules : {c.poolRulesText}.</T> : null}
              {c.format.type !== 'pools' ? <T v="small" color={t.ink2}>Tableau final : {c.bracketRulesText}.</T> : null}
            </View>
          ))}
          <T v="small" color={t.muted}>En poule, le classement se fait au nombre de victoires. À égalité entre deux joueurs, la rencontre directe décide ; à trois ou plus, la différence de sets puis de points.</T>
        </Card>
        {x.rulesText ? <Card style={{ gap: 6 }}><T v="h3">Règlement du tournoi</T><T color={t.ink2}>{x.rulesText}</T></Card> : null}
      </Section>

      {x.description || x.settings.paymentInfo || x.settings.contactEmail
        ? (
            <Section title="Informations pratiques">
              <Card style={{ gap: space.md }}>
                {x.description ? <T color={t.ink2}>{x.description}</T> : null}
                {x.settings.paymentInfo ? <View><T v="h3">Tarif et règlement</T><T color={t.ink2}>{x.settings.paymentInfo}</T></View> : null}
                {x.settings.contactEmail ? <View><T v="h3">Contact</T><T color={t.ink2}>{x.settings.contactEmail}</T></View> : null}
              </Card>
            </Section>
          )
        : null}
    </Screen>
  )
}
