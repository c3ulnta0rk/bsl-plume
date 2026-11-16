import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Platform, View } from 'react-native'
import { ActionError, useAction } from '@/features/orga'
import { useTournament } from '@/features/tournament'
import { del, get, patch, post } from '@/lib/api'
import { Banner, Button, Card, Choice, Field, Row, Screen, Section, space, Switcher, T, useTheme } from '@/ui'

interface Staff { userId: string, name: string, email: string, role: 'admin' | 'scorer' }

export default function Settings() {
  const t = useTheme()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { snap } = useTournament(id)
  const act = useAction()
  const staff = useQuery({ queryKey: ['t', id, 'staff'], queryFn: () => get<Staff[]>(`/organizer/tournaments/${id}/staff`) })
  const [f, setF] = useState<Record<string, string> | null>(null)
  const [saved, setSaved] = useState(false)
  const [mail, setMail] = useState('')
  const [role, setRole] = useState<'admin' | 'scorer'>('scorer')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const x = snap?.tournament
  useEffect(() => {
    if (x && !f) {
      setF({
        name: x.name, clubName: x.clubName, location: x.location, startDate: x.startDate, description: x.description, rulesText: x.rulesText,
        paymentInfo: x.settings.paymentInfo ?? '', contactEmail: x.settings.contactEmail ?? '', registrationDeadline: x.settings.registrationDeadline ?? '', restMinutes: String(x.settings.restMinutes ?? 10)
      })
    }
  }, [x, f])
  if (!x || !f) return null
  const field = (key: string, label: string, extra: object = {}) => <Field label={label} value={f[key]} onChangeText={v => { setSaved(false); setF({ ...f, [key]: v }) }} {...extra} />
  const save = async () => {
    const ok = await act.run('save', () => patch(`/organizer/tournaments/${id}`, {
      name: f.name, clubName: f.clubName, location: f.location, startDate: f.startDate, description: f.description, rulesText: f.rulesText,
      settings: { paymentInfo: f.paymentInfo, contactEmail: f.contactEmail, registrationDeadline: f.registrationDeadline || null, restMinutes: parseInt(f.restMinutes!, 10) || 0 }
    }))
    setSaved(ok)
  }
  const exportJson = async () => {
    await act.run('export', async () => {
      const data = await get<object>(`/organizer/tournaments/${id}/export`)
      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }))
        const a = document.createElement('a')
        a.href = url
        a.download = `${x.slug}.plume.json`
        a.click()
        URL.revokeObjectURL(url)
      }
    })
  }
  const importJson = () => {
    if (Platform.OS !== 'web') return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const text = await file.text()
      let newId = ''
      const ok = await act.run('import', async () => { newId = (await post<{ id: string }>('/organizer/import', JSON.parse(text))).id })
      if (ok) router.replace(`/orga/${newId}` as never)
    }
    input.click()
  }
  return (
    <Screen maxWidth={860}>
      <ActionError error={act.error} />
      <Section title="Visibilité">
        <Card style={{ gap: space.md }}>
          <Choice
            label="État du tournoi"
            value={x.status}
            onChange={v => void act.run('status', () => patch(`/organizer/tournaments/${id}`, { status: v }))}
            options={[{ value: 'draft', label: 'Brouillon', hint: 'Invisible du public' }, { value: 'published', label: 'Publié', hint: 'Visible, pas commencé' }, { value: 'running', label: 'En cours', hint: 'Jour du tournoi' }, { value: 'finished', label: 'Terminé' }]}
          />
          <Switcher value={x.registrationOpen} onChange={v => void act.run('reg', () => patch(`/organizer/tournaments/${id}`, { registrationOpen: v }))} label="Inscriptions en ligne ouvertes" />
        </Card>
      </Section>
      <Section title="Informations">
        <Card style={{ gap: space.md }}>
          {field('name', 'Nom du tournoi')}
          <Row wrap gap={space.md} align="flex-start">{field('clubName', 'Club organisateur')}{field('location', 'Lieu')}</Row>
          <Row wrap gap={space.md} align="flex-start">
            {field('startDate', 'Date (AAAA-MM-JJ)')}
            {field('registrationDeadline', 'Date limite d\'inscription (AAAA-MM-JJ)', { placeholder: 'Aucune' })}
          </Row>
          {field('description', 'Présentation', { multiline: true })}
          {field('paymentInfo', 'Tarif et règlement', { multiline: true, hint: 'Rappelé dans le mail de validation. Le site n\'encaisse rien.' })}
          {field('contactEmail', 'Contact affiché', { autoCapitalize: 'none' })}
        </Card>
      </Section>
      <Section title="Règlement et rythme">
        <Card style={{ gap: space.md }}>
          {field('rulesText', 'Règlement du tournoi', { multiline: true, hint: 'Affiché sur la page publique, sous les formats de score de chaque tableau.' })}
          {field('restMinutes', 'Repos minimal entre deux matchs d\'un joueur (minutes)', { keyboardType: 'number-pad', hint: 'Utilisé pour proposer les matchs et estimer les horaires. Baissez-le si le tournoi prend du retard.', style: { flexGrow: 0 } })}
        </Card>
      </Section>
      {saved ? <Banner tone="success" icon="checkmark-circle" text="Modifications enregistrées." /> : null}
      <Button label="Enregistrer" icon="checkmark" size="lg" loading={act.busy === 'save'} onPress={() => void save()} testID="settings-save" />

      <Section title="Équipe">
        <Card style={{ gap: space.md }}>
          <T v="small" color={t.ink2}>Un co-organisateur a tous les droits. La table de marque peut seulement appeler les matchs et saisir les scores. La personne doit avoir un compte.</T>
          {(staff.data ?? []).map(s => (
            <Row key={s.userId} justify="space-between" wrap>
              <View><T v="h3">{s.name}</T><T v="small" color={t.muted}>{s.email} · {s.role === 'admin' ? 'co-organisateur' : 'table de marque'}</T></View>
              <Button label="Retirer" size="sm" kind="ghost" onPress={() => void act.run('staff', () => del(`/organizer/tournaments/${id}/staff/${s.userId}`))} />
            </Row>
          ))}
          <Row wrap gap={space.md} align="flex-end">
            <Field label="Adresse mail du compte" value={mail} onChangeText={setMail} autoCapitalize="none" keyboardType="email-address" />
            <Choice value={role} onChange={setRole} options={[{ value: 'scorer', label: 'Table de marque' }, { value: 'admin', label: 'Co-organisateur' }]} />
          </Row>
          <Button label="Ajouter à l'équipe" icon="person-add" kind="secondary" disabled={!mail.trim()} onPress={async () => { if (await act.run('staff', () => post(`/organizer/tournaments/${id}/staff`, { email: mail, role }))) setMail('') }} />
        </Card>
      </Section>

      <Section title="Sauvegarde et mode salle">
        <Card style={{ gap: space.md }}>
          <T v="small" color={t.ink2}>L'export contient tout le tournoi : inscrits, tirages, résultats. Il sert de sauvegarde, et permet de faire tourner le tournoi sur un ordinateur de la salle sans Internet, puis de renvoyer les résultats ici à la fin.</T>
          <Row wrap>
            <Button label="Exporter le tournoi" icon="download-outline" kind="secondary" loading={act.busy === 'export'} onPress={() => void exportJson()} testID="export" />
            <Button label="Importer un export" icon="cloud-upload-outline" kind="secondary" loading={act.busy === 'import'} onPress={importJson} />
          </Row>
          {Platform.OS !== 'web' ? <T v="small" color={t.muted}>L'export et l'import se font depuis le site web.</T> : null}
        </Card>
      </Section>

      <Section title="Suppression">
        <Card style={{ gap: space.md }}>
          {confirmDelete
            ? (
                <>
                  <Banner tone="danger" icon="warning" text="Tout sera supprimé : inscriptions, tirages et résultats. Cette action est définitive." />
                  <Row wrap>
                    <Button label="Supprimer définitivement" kind="danger" loading={act.busy === 'delete'} onPress={async () => { if (await act.run('delete', () => del(`/organizer/tournaments/${id}`))) router.replace('/orga' as never) }} />
                    <Button label="Annuler" kind="secondary" onPress={() => setConfirmDelete(false)} />
                  </Row>
                </>
              )
            : <Button label="Supprimer ce tournoi" icon="trash-outline" kind="danger" onPress={() => setConfirmDelete(true)} />}
        </Card>
      </Section>
    </Screen>
  )
}
