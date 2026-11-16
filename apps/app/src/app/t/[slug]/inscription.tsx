import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'
import { useTournament } from '@/features/tournament'
import { post } from '@/lib/api'
import { DISCIPLINES, isDoubles } from '@/lib/format'
import { useSession } from '@/lib/session'
import { Banner, Button, Card, Chip, Choice, Field, Icon, radius, Row, Screen, space, T, useTheme } from '@/ui'

interface Partner { firstName: string, lastName: string, licence: string, club: string }
const emptyPartner: Partner = { firstName: '', lastName: '', licence: '', club: '' }

export default function Register() {
  const t = useTheme()
  const router = useRouter()
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const { snap } = useTournament(slug)
  const { user } = useSession()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [club, setClub] = useState('')
  const [licence, setLicence] = useState('')
  const [gender, setGender] = useState<'M' | 'F' | null>(null)
  const [note, setNote] = useState('')
  const [picked, setPicked] = useState<Record<string, Partner>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  useEffect(() => { if (user && !email) setEmail(user.email) }, [user, email])
  if (!snap) return null
  const x = snap.tournament
  if (!x.registrationOpen || x.status === 'finished') {
    return <Screen maxWidth={640}><Banner tone="warn" icon="lock-closed" text="Les inscriptions en ligne sont closes pour ce tournoi. Adressez-vous à l'organisateur." /></Screen>
  }
  if (sent) {
    return (
      <Screen maxWidth={640}>
        <Card style={{ gap: space.md }} testID="registration-sent">
          <Icon name="mail-unread" size={40} color={t.action} />
          <T v="title">Vérifiez votre boîte mail</T>
          <T color={t.ink2}>Un message vient d'être envoyé à {email}. Ouvrez le lien qu'il contient pour confirmer votre demande.</T>
          <T color={t.ink2}>L'organisateur validera ensuite votre inscription. {x.settings.paymentInfo ? 'Les modalités de règlement vous seront rappelées à ce moment-là.' : ''}</T>
          <Button label="Retour au tournoi" kind="secondary" onPress={() => router.replace(`/t/${x.slug}` as never)} />
        </Card>
      </Screen>
    )
  }
  const toggle = (id: string) => setPicked((p) => {
    const n = { ...p }
    if (n[id]) delete n[id]
    else n[id] = { ...emptyPartner }
    return n
  })
  const setPartner = (id: string, patch: Partial<Partner>) => setPicked(p => ({ ...p, [id]: { ...p[id]!, ...patch } }))
  const submit = async () => {
    setError(null)
    const ids = Object.keys(picked)
    if (!firstName.trim() || !lastName.trim()) return setError('Indiquez votre prénom et votre nom.')
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Indiquez une adresse mail valide : elle sert à confirmer l\'inscription.')
    if (ids.length === 0) return setError('Choisissez au moins un tableau.')
    for (const id of ids) {
      const c = snap.categories.find(k => k.id === id)!
      if (isDoubles(c.discipline) && (!picked[id]!.firstName.trim() || !picked[id]!.lastName.trim())) return setError(`Indiquez le prénom et le nom de votre partenaire pour « ${c.name} ».`)
    }
    setBusy(true)
    try {
      await post(`/tournaments/${x.slug}/registrations`, {
        firstName, lastName, email, phone: phone || null, club: club || null, licence: licence || null, gender, note: note || null,
        categories: ids.map((id) => {
          const c = snap.categories.find(k => k.id === id)!
          const p = picked[id]!
          return { categoryId: id, partner: isDoubles(c.discipline) ? { firstName: p.firstName, lastName: p.lastName, licence: p.licence || null, club: p.club || null } : null }
        })
      })
      setSent(true)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Screen maxWidth={760}>
      <View style={{ gap: 4 }}>
        <T v="title" accessibilityRole="header">Inscription</T>
        <T color={t.ink2}>Trois étapes : vous remplissez ce formulaire, vous confirmez votre adresse par mail, puis l'organisateur valide votre inscription.</T>
      </View>
      <Card style={{ gap: space.md }}>
        <T v="h2">1. Vous</T>
        <Row wrap gap={space.md} align="flex-start">
          <Field label="Prénom" value={firstName} onChangeText={setFirstName} autoComplete="given-name" testID="reg-firstname" />
          <Field label="Nom" value={lastName} onChangeText={setLastName} autoComplete="family-name" testID="reg-lastname" />
        </Row>
        <Row wrap gap={space.md} align="flex-start">
          <Field label="Adresse mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" testID="reg-email" />
          <Field label="Téléphone (facultatif)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" />
        </Row>
        <Row wrap gap={space.md} align="flex-start">
          <Field label="Club (facultatif)" value={club} onChangeText={setClub} />
          <Field label="Numéro de licence (facultatif)" value={licence} onChangeText={setLicence} hint="Il permet de relier vos tournois dans votre historique." />
        </Row>
        <Choice label="Vous jouez en (facultatif)" value={gender} onChange={setGender} options={[{ value: 'F', label: 'Dames' }, { value: 'M', label: 'Hommes' }]} />
      </Card>
      <Card style={{ gap: space.md }}>
        <T v="h2">2. Vos tableaux</T>
        <T v="small" color={t.ink2}>Vous pouvez en choisir plusieurs. L'organisateur peut vous proposer un autre tableau selon votre niveau.</T>
        {snap.categories.map((c) => {
          const on = !!picked[c.id]
          const closed = c.status !== 'registration'
          const full = c.counts.accepted >= c.maxEntries
          return (
            <View key={c.id} style={{ borderWidth: 1.5, borderColor: on ? t.action : t.line, borderRadius: radius.md, backgroundColor: on ? t.actionSoft : t.surface, opacity: closed ? 0.5 : 1 }}>
              <Pressable testID={`reg-cat-${c.name}`} accessibilityRole="checkbox" accessibilityState={{ checked: on, disabled: closed }} accessibilityLabel={c.name} disabled={closed} onPress={() => toggle(c.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, minHeight: 60 }}>
                <Icon name={on ? 'checkbox' : 'square-outline'} size={26} color={on ? t.action : t.muted} />
                <View style={{ flex: 1 }}>
                  <T v="h3">{c.name}</T>
                  <T v="small" color={t.ink2}>{DISCIPLINES[c.discipline]}{c.level ? ` · ${c.level}` : ''}</T>
                </View>
                {closed ? <Chip label="Clos" small /> : full ? <Chip label="Complet, liste d'attente" tone="warn" small /> : <Chip label={`${c.maxEntries - c.counts.accepted} places`} tone="success" small />}
              </Pressable>
              {on && isDoubles(c.discipline)
                ? (
                    <View style={{ padding: space.md, paddingTop: 0, gap: space.md }}>
                      <T v="small" style={{ fontWeight: '700' }}>Votre partenaire</T>
                      <Row wrap gap={space.md} align="flex-start">
                        <Field label="Prénom du partenaire" value={picked[c.id]!.firstName} onChangeText={v => setPartner(c.id, { firstName: v })} testID={`reg-partner-firstname-${c.name}`} />
                        <Field label="Nom du partenaire" value={picked[c.id]!.lastName} onChangeText={v => setPartner(c.id, { lastName: v })} testID={`reg-partner-lastname-${c.name}`} />
                      </Row>
                      <Row wrap gap={space.md} align="flex-start">
                        <Field label="Club du partenaire (facultatif)" value={picked[c.id]!.club} onChangeText={v => setPartner(c.id, { club: v })} />
                        <Field label="Licence du partenaire (facultatif)" value={picked[c.id]!.licence} onChangeText={v => setPartner(c.id, { licence: v })} />
                      </Row>
                    </View>
                  )
                : null}
            </View>
          )
        })}
      </Card>
      <Card style={{ gap: space.md }}>
        <T v="h2">3. Un mot pour l'organisateur</T>
        <Field label="Message (facultatif)" value={note} onChangeText={setNote} multiline placeholder="Classement, contrainte horaire, recherche de partenaire…" />
        {x.settings.paymentInfo ? <Banner tone="info" icon="card-outline" text={`Règlement : ${x.settings.paymentInfo} Le site n'encaisse rien.`} /> : null}
      </Card>
      {error ? <Banner tone="danger" icon="alert-circle" text={error} /> : null}
      <Button label="Envoyer ma demande d'inscription" icon="send" size="lg" full loading={busy} onPress={() => void submit()} testID="reg-submit" />
    </Screen>
  )
}
