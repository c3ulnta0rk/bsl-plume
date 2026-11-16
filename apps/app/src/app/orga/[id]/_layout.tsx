import { Slot, useLocalSearchParams, usePathname, useRouter } from 'expo-router'
import { Text, View } from 'react-native'
import { useOrgRegistrations } from '@/features/orga'
import { useTournament } from '@/features/tournament'
import { TOURNAMENT_STATUS } from '@/lib/format'
import { useSession } from '@/lib/session'
import { Banner, Button, Chip, font, Loading, Row, Screen, space, Tabs, useTheme, useWide } from '@/ui'

export default function OrgLayout() {
  const t = useTheme()
  const wide = useWide()
  const router = useRouter()
  const path = usePathname()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user, ready } = useSession()
  const { q, snap } = useTournament(user ? id : undefined)
  const regs = useOrgRegistrations(id)
  if (!ready || (user && q.isLoading)) return <Loading />
  if (!user) return <Screen maxWidth={560}><Banner tone="warn" text="Connectez-vous pour gérer ce tournoi." action={<Button label="Connexion" size="sm" onPress={() => router.push(`/connexion?next=/orga/${id}` as never)} />} /></Screen>
  if (!snap || regs.isError) {
    return <Screen maxWidth={560}><Banner tone="danger" icon="alert-circle" text={((q.error ?? regs.error) as Error | null)?.message ?? 'Tournoi introuvable.'} /><Button label="Mes tournois" kind="secondary" onPress={() => router.replace('/orga' as never)} /></Screen>
  }
  const x = snap.tournament
  const base = `/orga/${id}`
  const sub = path.startsWith(base) ? path.slice(base.length).split('/')[1] ?? '' : ''
  const pending = (regs.data ?? []).filter(r => r.status === 'pending').length
  const tabs = [
    { value: '', label: 'Pilotage' },
    { value: 'inscriptions', label: 'Inscriptions', badge: pending || undefined },
    { value: 'tableaux', label: 'Tableaux et tirage' },
    { value: 'reglages', label: 'Réglages' },
    { value: 'journal', label: 'Journal' },
    { value: 'affiche', label: 'Affiche QR' }
  ]
  return (
    <View style={{ flex: 1 }}>
      <View style={{ backgroundColor: t.night, borderTopWidth: 1, borderColor: t.boardLine }}>
        <View style={{ width: '100%', maxWidth: 1240, alignSelf: 'center', paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.md }}>
          <Row justify="space-between" wrap>
            <View style={{ flex: 1, minWidth: 220, gap: 4 }}>
              <Row>
                <Chip label="Organisation" tone="accent" small icon="construct" />
                <Chip label={TOURNAMENT_STATUS[x.status]} tone={x.status === 'running' ? 'live' : x.status === 'draft' ? 'warn' : 'neutral'} small />
              </Row>
              <Text accessibilityRole="header" style={{ fontFamily: font.display, fontSize: wide ? 34 : 26, lineHeight: wide ? 36 : 28, color: '#FFFFFF' }}>{x.name}</Text>
            </View>
            <Button label="Page publique" icon="open-outline" kind="secondary" size="sm" onPress={() => router.push(`/t/${x.slug}` as never)} />
          </Row>
          <Tabs dark value={tabs.some(tab => tab.value === sub) ? sub : ''} options={tabs} onChange={v => router.replace(`${base}${v ? `/${v}` : ''}` as never)} />
        </View>
      </View>
      <Slot />
    </View>
  )
}
