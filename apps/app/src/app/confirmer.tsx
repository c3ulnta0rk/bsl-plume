import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { post } from '@/lib/api'
import { Banner, Button, Card, Loading, Screen, space, T, useTheme } from '@/ui'

/** Page ouverte depuis le lien du mail de confirmation d'inscription. */
export default function Confirm() {
  const t = useTheme()
  const router = useRouter()
  const { token } = useLocalSearchParams<{ token?: string }>()
  const [state, setState] = useState<{ slug: string, name: string, categories: string[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!token) { setError('Lien incomplet : ouvrez le lien reçu par mail.'); return }
    post<{ slug: string, name: string, categories: string[] }>('/registrations/confirm', { token }).then(setState).catch(e => setError((e as Error).message))
  }, [token])
  if (error) return <Screen maxWidth={560}><Banner tone="danger" icon="alert-circle" text={error} /></Screen>
  if (!state) return <Loading label="Confirmation en cours" />
  return (
    <Screen maxWidth={560}>
      <Card style={{ gap: space.md }}>
        <T v="title">Adresse confirmée</T>
        <T color={t.ink2}>Votre demande d'inscription à « {state.name} » est transmise à l'organisateur pour {state.categories.length > 1 ? 'les tableaux' : 'le tableau'} : {state.categories.join(', ')}.</T>
        <T color={t.ink2}>Vous recevrez un mail dès qu'elle sera validée.</T>
        <Button label="Voir le tournoi" icon="arrow-forward" onPress={() => router.replace(`/t/${state.slug}` as never)} />
      </Card>
    </Screen>
  )
}
