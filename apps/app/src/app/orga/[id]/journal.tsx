import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'
import { View } from 'react-native'
import { get } from '@/lib/api'
import { dateFr, hhmm } from '@/lib/format'
import { Card, Chip, Empty, Loading, Row, Screen, space, T, useTheme, type Tone } from '@/ui'

interface Entry { id: string, type: string, message: string, createdAt: string }
const LABEL: Record<string, { label: string, tone: Tone }> = {
  incident: { label: 'Imprévu', tone: 'warn' }, result: { label: 'Résultat', tone: 'info' }, draw: { label: 'Tirage', tone: 'success' },
  registration: { label: 'Inscription', tone: 'neutral' }, tournament: { label: 'Tournoi', tone: 'night' }
}

/** Trace de toutes les décisions prises pendant le tournoi : utile en cas de réclamation. */
export default function Journal() {
  const t = useTheme()
  const { id } = useLocalSearchParams<{ id: string }>()
  const q = useQuery({ queryKey: ['t', id, 'journal'], queryFn: () => get<Entry[]>(`/organizer/tournaments/${id}/journal`) })
  if (q.isLoading) return <Loading />
  const list = q.data ?? []
  return (
    <Screen maxWidth={860}>
      <T color={t.ink2}>Chaque décision qui change le déroulement du tournoi est notée ici avec son heure : tirages, forfaits, changements de format, terrains fermés, résultats corrigés.</T>
      {list.length === 0
        ? <Empty icon="document-text-outline" title="Journal vide" />
        : (
            <Card pad={0} style={{ overflow: 'hidden' }}>
              {list.map((e, i) => {
                const k = LABEL[e.type] ?? { label: e.type, tone: 'neutral' as Tone }
                const d = Date.parse(e.createdAt)
                return (
                  <Row key={e.id} align="flex-start" gap={space.md} style={{ padding: space.md, borderBottomWidth: i === list.length - 1 ? 0 : 1, borderColor: t.line }}>
                    <View style={{ width: 92 }}>
                      <T v="h3">{hhmm(d)}</T>
                      <T v="small" color={t.muted} style={{ fontSize: 12 }}>{dateFr(e.createdAt, false).replace(/ \d{4}$/, '')}</T>
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Chip label={k.label} tone={k.tone} small />
                      <T>{e.message}</T>
                    </View>
                  </Row>
                )
              })}
            </Card>
          )}
    </Screen>
  )
}
