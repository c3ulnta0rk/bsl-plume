import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ActionError, useAction } from '@/features/orga'
import { get, post } from '@/lib/api'
import { dateFr, TOURNAMENT_STATUS } from '@/lib/format'
import { useSession } from '@/lib/session'
import type { TournamentStatus } from '@/lib/types'
import { Button, Card, Chip, Empty, Field, Loading, Row, Screen, Section, Sheet, space, T, useTheme } from '@/ui'

interface Mine { id: string, slug: string, name: string, status: TournamentStatus, startDate: string, location: string, role: string }

export default function Organizer() {
  const t = useTheme()
  const router = useRouter()
  const { user, ready } = useSession()
  const q = useQuery({ queryKey: ['orga', 'tournaments', user?.id], enabled: !!user, queryFn: () => get<Mine[]>('/organizer/tournaments') })
  const act = useAction()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [clubName, setClubName] = useState('')
  const [location, setLocation] = useState('')
  const [startDate, setStartDate] = useState('')
  const [courts, setCourts] = useState('5')
  if (!ready) return <Loading />
  if (!user) {
    return (
      <Screen maxWidth={640}>
        <Card style={{ gap: space.md }}>
          <T v="title" accessibilityRole="header">Organiser un tournoi</T>
          <T color={t.ink2}>Créez vos tableaux, prenez les inscriptions, faites les tirages, puis pilotez les terrains et les scores le jour J. Tout changement de dernière minute est prévu : forfait, retard, terrain en moins, format raccourci.</T>
          <Button label="Se connecter ou créer un compte" icon="log-in-outline" size="lg" onPress={() => router.push('/connexion?next=/orga' as never)} testID="orga-login" />
        </Card>
      </Screen>
    )
  }
  const create = async () => {
    let id = ''
    const iso = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(startDate.trim())
    const ok = await act.run('create', async () => {
      const r = await post<{ id: string }>('/organizer/tournaments', { name, clubName, location, startDate: iso ? `${iso[3]}-${iso[2]}-${iso[1]}` : startDate.trim(), courts: parseInt(courts, 10) || 4 })
      id = r.id
    })
    if (ok) { setOpen(false); router.push(`/orga/${id}/tableaux` as never) }
  }
  return (
    <Screen maxWidth={860}>
      <Section title="Mes tournois" right={<Button label="Nouveau tournoi" icon="add" onPress={() => setOpen(true)} testID="new-tournament" />}>
        {q.isLoading
          ? <Loading />
          : (q.data ?? []).length === 0
              ? <Empty icon="trophy-outline" title="Aucun tournoi pour le moment" text="Créez votre premier tournoi : il reste en brouillon, invisible du public, tant que vous ne le publiez pas." action={<Button label="Créer un tournoi" icon="add" onPress={() => setOpen(true)} />} />
              : (q.data ?? []).map(x => (
                  <Card key={x.id} onPress={() => router.push(`/orga/${x.id}` as never)} testID={`orga-${x.slug}`} style={{ gap: 4 }}>
                    <Row justify="space-between" wrap>
                      <T v="h2">{x.name}</T>
                      <Chip label={TOURNAMENT_STATUS[x.status]} tone={x.status === 'running' ? 'live' : x.status === 'draft' ? 'warn' : x.status === 'finished' ? 'neutral' : 'success'} />
                    </Row>
                    <T v="small" color={t.ink2}>{dateFr(x.startDate)}{x.location ? ` · ${x.location}` : ''}{x.role !== 'owner' ? ` · ${x.role === 'admin' ? 'co-organisateur' : 'table de marque'}` : ''}</T>
                  </Card>
                ))}
      </Section>
      <Sheet visible={open} onClose={() => setOpen(false)} title="Nouveau tournoi">
        <Field label="Nom du tournoi" value={name} onChangeText={setName} placeholder="Tournoi de printemps" testID="t-name" />
        <Field label="Club organisateur" value={clubName} onChangeText={setClubName} />
        <Field label="Lieu" value={location} onChangeText={setLocation} placeholder="Gymnase, ville" />
        <Row wrap gap={space.md} align="flex-start">
          <Field label="Date" value={startDate} onChangeText={setStartDate} placeholder="JJ/MM/AAAA" hint="Exemple : 14/03/2027" testID="t-date" />
          <Field label="Nombre de terrains" value={courts} onChangeText={setCourts} keyboardType="number-pad" hint="Modifiable à tout moment." testID="t-courts" />
        </Row>
        <ActionError error={act.error} />
        <Button label="Créer le tournoi" icon="checkmark" full size="lg" loading={act.busy === 'create'} onPress={() => void create()} testID="t-create" />
      </Sheet>
    </Screen>
  )
}
