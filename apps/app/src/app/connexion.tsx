import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { get } from '@/lib/api'
import { REG_STATUS } from '@/lib/format'
import { useSession } from '@/lib/session'
import type { RegistrationStatus } from '@/lib/types'
import { Banner, Button, Card, Chip, Choice, Empty, Field, Loading, Row, Screen, Section, space, T, useTheme } from '@/ui'

interface MyReg { id: string, status: RegistrationStatus, category: string, tournament: string, slug: string, date: string, organizerNote: string | null }

export default function Account() {
  const t = useTheme()
  const router = useRouter()
  const { next } = useLocalSearchParams<{ next?: string }>()
  const { user, login, register, logout, ready } = useSession()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const regs = useQuery({ queryKey: ['my-registrations', user?.id], enabled: !!user, queryFn: () => get<MyReg[]>('/me/registrations') })

  if (!ready) return <Loading />
  if (user) {
    return (
      <Screen maxWidth={720}>
        <Card style={{ gap: space.md }}>
          <T v="title">{user.name}</T>
          <T color={t.ink2}>{user.email}</T>
          <Row wrap>
            <Button label="Mes tournois organisés" icon="construct-outline" kind="secondary" onPress={() => router.push('/orga' as never)} />
            <Button label="Se déconnecter" icon="log-out-outline" kind="ghost" onPress={() => void logout()} />
          </Row>
        </Card>
        <Section title="Mes inscriptions">
          {regs.isLoading
            ? <Loading />
            : (regs.data ?? []).length === 0
                ? <Empty icon="ticket-outline" title="Aucune inscription" text="Les inscriptions faites avec cette adresse mail apparaîtront ici." />
                : (regs.data ?? []).map(r => (
                    <Card key={r.id} onPress={() => router.push(`/t/${r.slug}` as never)} style={{ gap: 6 }}>
                      <Row justify="space-between" wrap>
                        <T v="h3">{r.tournament}</T>
                        <Chip label={REG_STATUS[r.status]} tone={r.status === 'accepted' ? 'success' : r.status === 'refused' ? 'danger' : r.status === 'withdrawn' ? 'neutral' : 'warn'} />
                      </Row>
                      <T v="small" color={t.ink2}>{r.category}</T>
                      {r.organizerNote ? <T v="small" color={t.ink2}>Message de l'organisateur : {r.organizerNote}</T> : null}
                    </Card>
                  ))}
        </Section>
      </Screen>
    )
  }
  const submit = async () => {
    setError(null)
    setBusy(true)
    try {
      if (mode === 'login') await login(email, password)
      else await register(name, email, password)
      if (next) router.replace(next as never)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Screen maxWidth={520}>
      <Card style={{ gap: space.lg }}>
        <View style={{ gap: 4 }}>
          <T v="title" accessibilityRole="header">{mode === 'login' ? 'Connexion' : 'Créer un compte'}</T>
          <T color={t.ink2}>Un compte sert à organiser un tournoi et à retrouver vos inscriptions. Il n'est pas nécessaire pour suivre un tournoi.</T>
        </View>
        <Choice value={mode} onChange={setMode} options={[{ value: 'login', label: 'J\'ai un compte' }, { value: 'register', label: 'Nouveau compte' }]} />
        {mode === 'register' ? <Field label="Nom affiché" value={name} onChangeText={setName} autoComplete="name" testID="account-name" /> : null}
        <Field label="Adresse mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" testID="account-email" />
        <Field label="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode === 'login' ? 'current-password' : 'new-password'} hint={mode === 'register' ? '8 caractères minimum.' : undefined} onSubmitEditing={() => void submit()} testID="account-password" />
        {error ? <Banner tone="danger" icon="alert-circle" text={error} /> : null}
        <Button label={mode === 'login' ? 'Se connecter' : 'Créer mon compte'} onPress={() => void submit()} loading={busy} full size="lg" testID="account-submit" />
      </Card>
    </Screen>
  )
}
