import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { ActionError, useAction, useOrgRegistrations } from '@/features/orga'
import { useTournament } from '@/features/tournament'
import { del, patch, post } from '@/lib/api'
import { isDoubles, REG_STATUS } from '@/lib/format'
import type { OrgRegistration, RegistrationStatus } from '@/lib/types'
import { Banner, Button, Card, Chip, Choice, Empty, Field, Loading, Row, Screen, Sheet, space, T, Tabs, useTheme, type Tone } from '@/ui'

const TONES: Record<RegistrationStatus, Tone> = { pending_email: 'neutral', pending: 'warn', accepted: 'success', waitlist: 'info', refused: 'danger', withdrawn: 'neutral' }
const ORDER: RegistrationStatus[] = ['pending', 'accepted', 'waitlist', 'pending_email', 'refused', 'withdrawn']

export default function Registrations() {
  const t = useTheme()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { snap } = useTournament(id)
  const regs = useOrgRegistrations(id)
  const act = useAction()
  const [status, setStatus] = useState<RegistrationStatus | null>(null)
  const [cat, setCat] = useState('all')
  const [moving, setMoving] = useState<OrgRegistration | null>(null)
  const [moveTo, setMoveTo] = useState<string | null>(null)
  const [noteFor, setNoteFor] = useState<{ reg: OrgRegistration, status: RegistrationStatus } | null>(null)
  const [note, setNote] = useState('')
  const [withdrawing, setWithdrawing] = useState<OrgRegistration | null>(null)
  const [mode, setMode] = useState<'walkover' | 'annul'>('walkover')
  const [reason, setReason] = useState('')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ categoryId: '', firstName: '', lastName: '', club: '', licence: '', email: '', pFirst: '', pLast: '', pClub: '' })
  if (!snap || regs.isLoading) return <Loading />
  const all = (regs.data ?? []).filter(r => cat === 'all' || r.categoryId === cat)
  const counts = (s: RegistrationStatus) => all.filter(r => r.status === s).length
  const current = status ?? (counts('pending') > 0 ? 'pending' : 'accepted')
  const list = all.filter(r => r.status === current)
  const catOf = (cid: string) => snap.categories.find(c => c.id === cid)
  const names = (r: OrgRegistration) => [r.player1?.name, r.player2?.name].filter(Boolean).join(' / ')
  const decide = (r: OrgRegistration, body: object, key = 'decide') => act.run(`${key}-${r.id}`, () => patch(`/organizer/registrations/${r.id}`, body))
  const addCat = catOf(form.categoryId) ?? snap.categories[0]
  const add = async () => {
    const ok = await act.run('add', () => post(`/organizer/tournaments/${id}/registrations`, {
      categoryId: addCat?.id,
      player: { firstName: form.firstName, lastName: form.lastName, club: form.club || null, licence: form.licence || null, email: form.email || null },
      partner: addCat && isDoubles(addCat.discipline) ? { firstName: form.pFirst, lastName: form.pLast, club: form.pClub || null } : null
    }))
    if (ok) { setForm({ ...form, firstName: '', lastName: '', licence: '', email: '', pFirst: '', pLast: '' }) }
  }
  return (
    <Screen maxWidth={980}>
      <Row justify="space-between" wrap>
        <Tabs value={cat} onChange={setCat} options={[{ value: 'all', label: 'Tous les tableaux' }, ...snap.categories.map(c => ({ value: c.id, label: c.name }))]} />
        <Button label="Ajouter une inscription" icon="person-add" onPress={() => { act.clearError(); setAdding(true) }} disabled={snap.categories.length === 0} testID="add-registration" />
      </Row>
      <Tabs value={current} onChange={setStatus} options={ORDER.map(s => ({ value: s, label: `${REG_STATUS[s]} (${counts(s)})` }))} />
      {!adding && !moving && !withdrawing && !noteFor ? <ActionError error={act.error} /> : null}
      {list.length === 0
        ? <Empty icon="ticket-outline" title={current === 'pending' ? 'Aucune inscription à valider' : 'Aucune inscription dans cette liste'} text={current === 'pending' ? 'Les nouvelles demandes confirmées par mail arrivent ici.' : undefined} />
        : list.map((r) => {
            const c = catOf(r.categoryId)
            const drawn = c?.status !== 'registration'
            return (
              <Card key={r.id} testID={`reg-${names(r)}`} style={{ gap: space.sm }}>
                <Row justify="space-between" wrap>
                  <View style={{ flex: 1, minWidth: 200 }}>
                    <T v="h3">{names(r)}</T>
                    <T v="small" color={t.ink2}>{[...new Set([r.player1?.club, r.player2?.club].filter(Boolean))].join(' / ') || 'Club non renseigné'}{r.player1?.licence ? ` · licence ${r.player1.licence}` : ''}</T>
                  </View>
                  <Row wrap>
                    {r.seed ? <Chip label={`Tête de série ${r.seed}`} tone="accent" small /> : null}
                    <Chip label={c?.name ?? '?'} tone="night" small />
                    <Chip label={REG_STATUS[r.status]} tone={TONES[r.status]} small />
                  </Row>
                </Row>
                <T v="small" color={t.muted}>{[r.email, r.phone, r.source === 'manual' ? 'saisie par l\'organisation' : 'inscription en ligne'].filter(Boolean).join(' · ')}</T>
                {r.note ? <T v="small" color={t.ink2}>Message du joueur : {r.note}</T> : null}
                {r.organizerNote ? <T v="small" color={t.ink2}>Votre message : {r.organizerNote}</T> : null}
                {r.status === 'withdrawn' ? <T v="small" color={t.warn}>{r.withdrawMode === 'annul' ? 'Résultats de poule annulés.' : 'Matchs restants perdus par forfait.'}</T> : null}
                <Row wrap>
                  {(r.status === 'pending' || r.status === 'waitlist' || r.status === 'pending_email' || r.status === 'refused') && !drawn
                    ? <Button label="Valider" icon="checkmark" size="sm" loading={act.busy === `accept-${r.id}`} onPress={() => void decide(r, { status: 'accepted' }, 'accept')} testID={`accept-${names(r)}`} />
                    : null}
                  {r.status === 'pending' ? <Button label="Liste d'attente" size="sm" kind="secondary" onPress={() => void decide(r, { status: 'waitlist' })} /> : null}
                  {r.status === 'pending' || r.status === 'waitlist' ? <Button label="Refuser" size="sm" kind="danger" onPress={() => { setNote(''); setNoteFor({ reg: r, status: 'refused' }) }} testID={`refuse-${names(r)}`} /> : null}
                  {r.status !== 'withdrawn' && r.status !== 'refused' && !drawn ? <Button label="Changer de tableau" size="sm" kind="secondary" icon="swap-horizontal" onPress={() => { setMoveTo(null); setNote(''); setMoving(r) }} testID={`move-${names(r)}`} /> : null}
                  {r.status === 'accepted' && !drawn
                    ? <Button label={r.seed ? 'Retirer la tête de série' : 'Tête de série'} size="sm" kind="ghost" onPress={() => void decide(r, { seed: r.seed ? null : Math.max(0, ...all.filter(k => k.categoryId === r.categoryId).map(k => k.seed ?? 0)) + 1 })} />
                    : null}
                  {r.status === 'accepted' && !drawn ? <Button label="Annuler la validation" size="sm" kind="ghost" onPress={() => void decide(r, { status: 'pending' })} /> : null}
                  {r.status === 'accepted' && drawn ? <Button label="Retirer du tableau" size="sm" kind="danger" icon="medkit-outline" onPress={() => { setReason(''); setMode('walkover'); setWithdrawing(r) }} testID={`withdraw-${names(r)}`} /> : null}
                  {r.status === 'withdrawn' ? <Button label="Réintégrer" size="sm" kind="secondary" onPress={() => void act.run(`re-${r.id}`, () => post(`/organizer/registrations/${r.id}/reinstate`))} /> : null}
                  {(r.status === 'pending_email' || r.status === 'refused') ? <Button label="Supprimer" size="sm" kind="ghost" onPress={() => void act.run(`del-${r.id}`, () => del(`/organizer/registrations/${r.id}`))} /> : null}
                </Row>
              </Card>
            )
          })}

      <Sheet visible={!!moving} onClose={() => setMoving(null)} title="Changer de tableau">
        {moving
          ? (
              <>
                <T color={t.ink2}>{names(moving)} a demandé « {catOf(moving.categoryId)?.name} ». Le joueur est prévenu par mail du changement.</T>
                <Choice
                  label="Nouveau tableau"
                  value={moveTo}
                  onChange={setMoveTo}
                  options={snap.categories.filter(c => c.id !== moving.categoryId && c.status === 'registration' && isDoubles(c.discipline) === isDoubles(catOf(moving.categoryId)!.discipline)).map(c => ({ value: c.id, label: c.name, hint: `${c.counts.accepted}/${c.maxEntries}` }))}
                />
                <Field label="Message au joueur (facultatif)" value={note} onChangeText={setNote} placeholder="Niveau plus adapté, tableau complet…" />
                <ActionError error={act.error} />
                <Button label="Déplacer" icon="swap-horizontal" full size="lg" disabled={!moveTo} loading={!!act.busy} onPress={async () => { if (await decide(moving, { categoryId: moveTo, organizerNote: note || null })) setMoving(null) }} testID="move-confirm" />
              </>
            )
          : null}
      </Sheet>

      <Sheet visible={!!noteFor} onClose={() => setNoteFor(null)} title="Refuser l'inscription">
        {noteFor
          ? (
              <>
                <T color={t.ink2}>{names(noteFor.reg)} sera prévenu par mail. Vous pouvez expliquer pourquoi.</T>
                <Field label="Message au joueur (facultatif)" value={note} onChangeText={setNote} multiline />
                <ActionError error={act.error} />
                <Button label="Refuser l'inscription" kind="danger" full size="lg" loading={!!act.busy} onPress={async () => { if (await decide(noteFor.reg, { status: 'refused', organizerNote: note || null })) setNoteFor(null) }} testID="refuse-confirm" />
              </>
            )
          : null}
      </Sheet>

      <Sheet visible={!!withdrawing} onClose={() => setWithdrawing(null)} title="Retirer du tableau">
        {withdrawing
          ? (
              <>
                <T color={t.ink2}>{names(withdrawing)} ne peut plus jouer dans « {catOf(withdrawing.categoryId)?.name} ». Choisissez ce que deviennent ses matchs de poule. En tableau final, son adversaire passe par forfait dans les deux cas.</T>
                <Choice
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: 'walkover', label: 'Forfait sur les matchs restants', hint: 'Les résultats déjà joués comptent' },
                    { value: 'annul', label: 'Annuler tous ses résultats', hint: 'Comme s\'il n\'avait pas joué la poule' }
                  ]}
                />
                <Field label="Motif (facultatif, noté au journal)" value={reason} onChangeText={setReason} placeholder="Blessure, départ…" />
                <ActionError error={act.error} />
                <Button label="Confirmer le retrait" kind="danger" full size="lg" loading={!!act.busy} onPress={async () => { if (await act.run('withdraw', () => post(`/organizer/registrations/${withdrawing.id}/withdraw`, { mode, reason: reason || undefined }))) setWithdrawing(null) }} testID="withdraw-confirm" />
              </>
            )
          : null}
      </Sheet>

      <Sheet visible={adding} onClose={() => setAdding(false)} title="Ajouter une inscription">
        <T v="small" color={t.ink2}>Pour une inscription prise par téléphone, sur papier ou sur place. Elle est validée d'office, ou mise en liste d'attente si le tableau est complet.</T>
        <Choice label="Tableau" value={addCat?.id ?? null} onChange={v => setForm({ ...form, categoryId: v })} options={snap.categories.map(c => ({ value: c.id, label: c.name, hint: c.status !== 'registration' ? 'Tirage fait' : `${c.counts.accepted}/${c.maxEntries}` }))} />
        <Row wrap gap={space.md} align="flex-start">
          <Field label="Prénom" value={form.firstName} onChangeText={v => setForm({ ...form, firstName: v })} testID="add-firstname" />
          <Field label="Nom" value={form.lastName} onChangeText={v => setForm({ ...form, lastName: v })} testID="add-lastname" />
        </Row>
        <Row wrap gap={space.md} align="flex-start">
          <Field label="Club" value={form.club} onChangeText={v => setForm({ ...form, club: v })} />
          <Field label="Licence" value={form.licence} onChangeText={v => setForm({ ...form, licence: v })} />
        </Row>
        <Field label="Adresse mail (facultatif)" value={form.email} onChangeText={v => setForm({ ...form, email: v })} autoCapitalize="none" keyboardType="email-address" />
        {addCat && isDoubles(addCat.discipline)
          ? (
              <>
                <T v="h3">Partenaire</T>
                <Row wrap gap={space.md} align="flex-start">
                  <Field label="Prénom du partenaire" value={form.pFirst} onChangeText={v => setForm({ ...form, pFirst: v })} testID="add-partner-firstname" />
                  <Field label="Nom du partenaire" value={form.pLast} onChangeText={v => setForm({ ...form, pLast: v })} testID="add-partner-lastname" />
                </Row>
                <Field label="Club du partenaire" value={form.pClub} onChangeText={v => setForm({ ...form, pClub: v })} />
              </>
            )
          : null}
        <ActionError error={act.error} />
        <Button label="Ajouter" icon="person-add" full size="lg" loading={act.busy === 'add'} onPress={() => void add()} testID="add-confirm" />
        <Banner tone="info" text="La fenêtre reste ouverte pour enchaîner plusieurs saisies." />
      </Sheet>
    </Screen>
  )
}
