import { useLocalSearchParams, useRouter } from 'expo-router'
import { PlayerPicker } from '@/features/player-pick'
import { useTournament } from '@/features/tournament'
import { Screen, T, useTheme } from '@/ui'

export default function Players() {
  const t = useTheme()
  const router = useRouter()
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const { snap, follows } = useTournament(slug)
  if (!snap) return null
  return (
    <Screen maxWidth={760}>
      <T color={t.ink2}>Touchez un joueur pour voir ses matchs et son historique.</T>
      <PlayerPicker snap={snap} selected={follows.ids} actionIcon="chevron-forward" selectedIcon="star" onPick={p => router.push(`/joueur/${p.id}?t=${snap.tournament.slug}` as never)} />
    </Screen>
  )
}
