import { Slot, useLocalSearchParams, usePathname, useRouter } from 'expo-router'
import { Text, View } from 'react-native'
import { useTournament } from '@/features/tournament'
import { dateFr } from '@/lib/format'
import { Banner, Button, Chip, font, Loading, Screen, space, Tabs, useTheme, useWide } from '@/ui'

export default function TournamentLayout() {
  const t = useTheme()
  const wide = useWide()
  const router = useRouter()
  const path = usePathname()
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const { q, snap } = useTournament(slug)

  if (q.isLoading) return <Loading label="Chargement du tournoi" />
  if (!snap) {
    return (
      <Screen maxWidth={560}>
        <Banner tone="danger" icon="alert-circle" text={(q.error as Error | null)?.message ?? 'Tournoi introuvable.'} />
        <Button label="Retour aux tournois" icon="arrow-back" kind="secondary" onPress={() => router.replace('/')} />
      </Screen>
    )
  }
  const x = snap.tournament
  const base = `/t/${x.slug}`
  const sub = path.startsWith(base) ? path.slice(base.length).split('/')[1] ?? '' : ''
  const live = snap.matches.filter(m => m.status === 'playing' || m.status === 'called').length
  const tabs = [
    { value: '', label: 'Aperçu' },
    { value: 'moi', label: 'Mon suivi' },
    { value: 'matchs', label: 'Matchs', badge: live || undefined },
    { value: 'tableaux', label: 'Tableaux' },
    { value: 'joueurs', label: 'Joueurs' },
    ...(x.registrationOpen && x.status !== 'finished' ? [{ value: 'inscription', label: 'S\'inscrire' }] : [])
  ]
  const active = tabs.some(tab => tab.value === sub) ? sub : sub === 'match' ? 'matchs' : ''
  return (
    <View style={{ flex: 1 }}>
      <View style={{ backgroundColor: t.night, borderTopWidth: 1, borderColor: t.boardLine }}>
        <View style={{ width: '100%', maxWidth: 1120, alignSelf: 'center', paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.md, gap: space.md }}>
          <View style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {x.status === 'running' ? <Chip label="En direct" tone="live" icon="radio-button-on" small /> : x.status === 'finished' ? <Chip label="Terminé" small /> : x.status === 'draft' ? <Chip label="Brouillon, visible de vous seul" tone="warn" small /> : null}
              <Text style={{ color: '#93A0CF', fontSize: 13, fontWeight: '700' }}>{dateFr(x.startDate)}{x.location ? ` · ${x.location}` : ''}</Text>
            </View>
            <Text accessibilityRole="header" style={{ fontFamily: font.display, fontSize: wide ? 40 : 30, lineHeight: wide ? 42 : 32, color: '#FFFFFF' }}>{x.name}</Text>
          </View>
          <Tabs dark value={active} options={tabs} onChange={v => router.replace(`${base}${v ? `/${v}` : ''}` as never)} />
        </View>
      </View>
      <Slot />
    </View>
  )
}
