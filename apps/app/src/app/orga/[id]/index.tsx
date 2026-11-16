import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { Text, View } from 'react-native'
import { MatchCard, MatchRow, sideName } from '@/features/match'
import { ActionError, useAction } from '@/features/orga'
import { useTournament } from '@/features/tournament'
import { patch, post } from '@/lib/api'
import { hhmm } from '@/lib/format'
import type { Match } from '@/lib/types'
import { Banner, Button, Card, Chip, Empty, font, Icon, radius, Row, Screen, Section, Sheet, space, T, useTheme, useWide } from '@/ui'

/** Salle de contrôle du tournoi : terrains, file d'attente, imprévus. */
export default function ControlRoom() {
  const t = useTheme()
  const wide = useWide()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { snap, ctx } = useTournament(id)
  const act = useAction()
  const [calling, setCalling] = useState<Match | null>(null)
  const [showAll, setShowAll] = useState(false)
  if (!snap) return null
  const x = snap.tournament
  const base = `/orga/${id}`
  const drawn = snap.categories.filter(c => c.status !== 'registration').length
  const setStatus = (status: string, extra: object = {}) => act.run(status, () => patch(`/organizer/tournaments/${id}`, { status, ...extra }))

  if (x.status === 'draft' || x.status === 'published') {
    const accepted = snap.categories.reduce((s, c) => s + c.counts.accepted, 0)
    const pending = snap.categories.reduce((s, c) => s + c.counts.pending, 0)
    const steps: { done: boolean, title: string, text: string, action?: React.ReactNode }[] = [
      { done: snap.categories.length > 0, title: 'Créer les tableaux', text: snap.categories.length ? `${snap.categories.length} tableaux, ${snap.categories.reduce((s, c) => s + c.maxEntries, 0)} places.` : 'Simple, double, mixte : places, formule et format de score pour chacun.', action: <Button label="Tableaux" size="sm" kind="secondary" onPress={() => router.replace(`${base}/tableaux` as never)} /> },
      { done: x.status !== 'draft', title: 'Publier le tournoi', text: x.status === 'draft' ? 'Il devient visible et ouvert aux inscriptions.' : 'Le tournoi est en ligne.', action: x.status === 'draft' ? <Button label="Publier" size="sm" icon="globe-outline" loading={act.busy === 'published'} disabled={snap.categories.length === 0} onPress={() => void setStatus('published')} testID="publish" /> : undefined },
      { done: accepted > 0 && pending === 0, title: 'Valider les inscriptions', text: `${accepted} validées${pending ? `, ${pending} à traiter` : ''}.`, action: <Button label="Inscriptions" size="sm" kind="secondary" onPress={() => router.replace(`${base}/inscriptions` as never)} /> },
      { done: snap.categories.length > 0 && drawn === snap.categories.length, title: 'Faire les tirages', text: `${drawn} tableau${drawn > 1 ? 'x' : ''} sur ${snap.categories.length} tiré${drawn > 1 ? 's' : ''}.`, action: <Button label="Tirage" size="sm" kind="secondary" onPress={() => router.replace(`${base}/tableaux` as never)} /> },
      { done: false, title: 'Démarrer le tournoi', text: 'Le pilotage des terrains s\'ouvre et les joueurs reçoivent leurs heures de passage.', action: <Button label="Démarrer" size="sm" icon="play" kind="accent" loading={act.busy === 'running'} disabled={drawn === 0} onPress={() => void setStatus('running', { registrationOpen: false })} testID="start-tournament" /> }
    ]
    return (
      <Screen maxWidth={860}>
        <ActionError error={act.error} />
        <Section title="Préparation">
          {steps.map((s, i) => (
            <Card key={s.title} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: s.done ? t.successBg : t.surface2 }}>
                {s.done ? <Icon name="checkmark" color={t.success} /> : <Text style={{ fontFamily: font.display, fontSize: 20, color: t.ink2 }}>{i + 1}</Text>}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <T v="h3">{s.title}</T>
                <T v="small" color={t.ink2}>{s.text}</T>
              </View>
              {s.action}
            </Card>
          ))}
        </Section>
      </Screen>
    )
  }

  const visible = snap.matches.filter(m => m.status !== 'cancelled')
  const done = visible.filter(m => m.status === 'completed').length
  const ready = visible.filter(m => m.status === 'pending' && m.entry1Id && m.entry2Id).sort((a, b) => (a.estimatedStart ?? Infinity) - (b.estimatedStart ?? Infinity) || a.number - b.number)
  const waiting = visible.filter(m => m.status === 'pending' && !(m.entry1Id && m.entry2Id)).length
  const free = snap.courts.filter(c => c.open && !c.matchId)
  const lastStart = Math.max(0, ...visible.filter(m => m.estimatedStart).map(m => m.estimatedStart!))
  const paused = x.settings.pausedUntil && Date.parse(x.settings.pausedUntil) > ctx.now
  const recent = visible.filter(m => m.status === 'completed').sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0)).slice(0, 6)
  const busyPlayers = new Set(visible.filter(m => m.status === 'called' || m.status === 'playing').flatMap(m => [m.entry1Id, m.entry2Id]).flatMap(e => ctx.entries.get(e ?? '')?.players.map(p => p.id) ?? []))
  const canPlay = (m: Match) => ![m.entry1Id, m.entry2Id].flatMap(e => ctx.entries.get(e ?? '')?.players.map(p => p.id) ?? []).some(p => busyPlayers.has(p))
  const pause = (minutes: number | null) => act.run('pause', () => patch(`/organizer/tournaments/${id}`, { settings: { pausedUntil: minutes === null ? null : new Date(Date.now() + minutes * 60_000).toISOString() } }))
  const stat = (value: string, label: string) => (
    <View style={{ flexGrow: 1, flexBasis: 130, backgroundColor: t.surface, borderRadius: radius.md, borderWidth: 1, borderColor: t.line, padding: space.md }}>
      <Text style={{ fontFamily: font.display, fontSize: 34, lineHeight: 36, color: t.ink, fontVariant: ['tabular-nums'] }}>{value}</Text>
      <T v="label">{label}</T>
    </View>
  )
  return (
    <Screen maxWidth={1240}>
      <ActionError error={act.error} />
      {x.status === 'finished' ? <Banner tone="info" icon="flag" text="Tournoi terminé. Vous pouvez encore corriger un résultat." action={<Button label="Rouvrir" size="sm" kind="secondary" onPress={() => void setStatus('running')} />} /> : null}
      {paused ? <Banner tone="warn" icon="pause-circle" text={`Pause jusqu'à ${hhmm(Date.parse(x.settings.pausedUntil!))} : les heures estimées sont décalées.`} action={<Button label="Reprendre" size="sm" kind="secondary" onPress={() => void pause(null)} />} /> : null}
      <Row wrap gap={space.sm} align="stretch">
        {stat(`${done}/${visible.length}`, 'Matchs joués')}
        {stat(String(ready.length), 'Prêts à lancer')}
        {stat(String(waiting), 'Attendent un adversaire')}
        {stat(lastStart && x.status === 'running' ? hhmm(lastStart) : '--:--', 'Dernier match vers')}
      </Row>
      {x.status === 'running'
        ? (
            <Row wrap>
              <Button label={free.length ? `Remplir ${free.length} terrain${free.length > 1 ? 's' : ''} libre${free.length > 1 ? 's' : ''}` : 'Tous les terrains sont occupés'} icon="flash" kind="accent" size="lg" disabled={free.length === 0 || ready.length === 0} loading={act.busy === 'auto'} onPress={() => void act.run('auto', () => post(`/organizer/tournaments/${id}/auto-call`, {}))} testID="auto-call" />
              {!paused ? <Button label="Pause 15 min" icon="pause" kind="secondary" size="lg" onPress={() => void pause(15)} /> : null}
              {!paused ? <Button label="Pause 30 min" icon="pause" kind="secondary" size="lg" onPress={() => void pause(30)} /> : null}
              {done === visible.length && visible.length > 0 ? <Button label="Clore le tournoi" icon="flag" size="lg" onPress={() => void setStatus('finished')} /> : null}
            </Row>
          )
        : null}

      <Section title="Terrains" right={<Button label="Ajouter un terrain" icon="add" size="sm" kind="secondary" loading={act.busy === 'court'} onPress={() => void act.run('court', () => post(`/organizer/tournaments/${id}/courts`, {}))} testID="add-court" />}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
          {snap.courts.map((c) => {
            const m = c.matchId ? snap.matches.find(k => k.id === c.matchId) : undefined
            const suggestion = !m && c.open ? ready.find(canPlay) : undefined
            return (
              <View key={c.id} testID={`court-${c.name}`} style={{ flexGrow: 1, flexBasis: wide ? 360 : '100%', gap: 6 }}>
                <Row justify="space-between">
                  <Row>
                    <Text style={{ fontFamily: font.display, fontSize: 24, color: t.ink }}>{c.name}</Text>
                    {!c.open ? <Chip label="Fermé" tone="warn" small /> : !m ? <Chip label="Libre" tone="success" small /> : null}
                  </Row>
                  {!m ? <Button label={c.open ? 'Fermer' : 'Rouvrir'} size="sm" kind="ghost" onPress={() => void act.run(`court-${c.id}`, () => patch(`/organizer/courts/${c.id}`, { open: !c.open }))} /> : null}
                </Row>
                {m
                  ? (
                      <MatchCard
                        m={m}
                        ctx={ctx}
                        onPress={() => router.push(`${base}/match/${m.id}` as never)}
                        footer={(
                          <Row wrap>
                            {m.status === 'called' ? <Button label="Démarrer" icon="play" kind="accent" size="sm" loading={act.busy === `start-${m.id}`} onPress={() => void act.run(`start-${m.id}`, () => post(`/organizer/matches/${m.id}/start`))} testID={`start-${m.number}`} /> : null}
                            <Button label="Score" icon="create" kind="secondary" size="sm" onPress={() => router.push(`${base}/match/${m.id}` as never)} testID={`score-${m.number}`} />
                            <Button label="Annuler l'appel" kind="ghost" size="sm" onPress={() => void act.run(`uncall-${m.id}`, () => post(`/organizer/matches/${m.id}/uncall`))} />
                          </Row>
                        )}
                      />
                    )
                  : (
                      <View style={{ borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.line, minHeight: 132, padding: space.md, justifyContent: 'center', gap: 8 }}>
                        {suggestion && x.status === 'running'
                          ? (
                              <>
                                <T v="label">À lancer ensuite · match n° {suggestion.number}</T>
                                <T v="h3" numberOfLines={2}>{sideName(suggestion, 1, ctx).name} contre {sideName(suggestion, 2, ctx).name}</T>
                                <Button label={`Appeler sur ${c.name}`} icon="megaphone" size="sm" loading={act.busy === `call-${c.id}`} onPress={() => void act.run(`call-${c.id}`, () => post(`/organizer/matches/${suggestion.id}/call`, { courtId: c.id }))} testID={`call-on-${c.name}`} />
                              </>
                            )
                          : <T v="small" color={t.muted} style={{ textAlign: 'center' }}>{c.open ? 'Aucun match prêt pour ce terrain.' : 'Terrain fermé : il n\'entre plus dans le calcul des horaires.'}</T>}
                      </View>
                    )}
              </View>
            )
          })}
        </View>
      </Section>

      <Section title={`File d'attente (${ready.length})`} right={ready.length > 8 ? <Button label={showAll ? 'Réduire' : 'Tout afficher'} size="sm" kind="ghost" onPress={() => setShowAll(!showAll)} /> : undefined}>
        {ready.length === 0
          ? <Empty icon="hourglass-outline" title="Aucun match prêt" text={waiting ? `${waiting} matchs attendent le résultat d'un match précédent.` : 'Tous les matchs sont lancés ou terminés.'} />
          : (
              <Card pad={0} style={{ overflow: 'hidden' }}>
                {(showAll ? ready : ready.slice(0, 8)).map(m => (
                  <MatchRow
                    key={m.id}
                    m={m}
                    ctx={ctx}
                    onPress={() => router.push(`${base}/match/${m.id}` as never)}
                    right={x.status === 'running' ? <Button label="Appeler" size="sm" kind="secondary" disabled={!canPlay(m)} onPress={() => setCalling(m)} testID={`call-${m.number}`} /> : undefined}
                  />
                ))}
              </Card>
            )}
      </Section>

      {recent.length > 0
        ? (
            <Section title="Derniers résultats">
              <Card pad={0} style={{ overflow: 'hidden' }}>
                {recent.map(m => <MatchRow key={m.id} m={m} ctx={ctx} onPress={() => router.push(`${base}/match/${m.id}` as never)} right={<Button label="Corriger" size="sm" kind="ghost" onPress={() => router.push(`${base}/match/${m.id}` as never)} />} />)}
              </Card>
            </Section>
          )
        : null}

      <Sheet visible={!!calling} onClose={() => setCalling(null)} title={calling ? `Appeler le match n° ${calling.number}` : ''}>
        {calling
          ? (
              <>
                <T v="h3">{sideName(calling, 1, ctx).name} contre {sideName(calling, 2, ctx).name}</T>
                {free.length === 0
                  ? <Banner tone="warn" text="Aucun terrain libre pour le moment." />
                  : free.map(c => <Button key={c.id} label={c.name} icon="megaphone" full size="lg" kind="secondary" onPress={() => { const m = calling; setCalling(null); void act.run('call', () => post(`/organizer/matches/${m.id}/call`, { courtId: c.id })) }} />)}
              </>
            )
          : null}
      </Sheet>
    </Screen>
  )
}
