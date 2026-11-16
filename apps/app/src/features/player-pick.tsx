import { Ionicons } from '@expo/vector-icons'
import { useMemo, useState } from 'react'
import { Pressable, View } from 'react-native'
import type { Snapshot } from '@/lib/types'
import { Card, Empty, Field, space, T, useTheme } from '@/ui'

export interface ListedPlayer { id: string, name: string, club: string | null, categories: string[] }

export function playersOf(snap: Snapshot): ListedPlayer[] {
  const map = new Map<string, ListedPlayer>()
  for (const c of snap.categories) {
    for (const e of c.entries) {
      for (const p of e.players) {
        const cur = map.get(p.id) ?? { id: p.id, name: p.name, club: p.club, categories: [] }
        cur.categories.push(c.name)
        map.set(p.id, cur)
      }
    }
  }
  return [...map.values()].sort((a, b) => a.name.split(' ').slice(-1)[0]!.localeCompare(b.name.split(' ').slice(-1)[0]!, 'fr'))
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Recherche d'un joueur du tournoi, avec une action par ligne. */
export function PlayerPicker({ snap, onPick, selected, actionIcon = 'star-outline', selectedIcon = 'star', limit }: {
  snap: Snapshot, onPick: (p: ListedPlayer) => void, selected?: Set<string>, actionIcon?: React.ComponentProps<typeof Ionicons>['name'], selectedIcon?: React.ComponentProps<typeof Ionicons>['name'], limit?: number
}) {
  const t = useTheme()
  const [q, setQ] = useState('')
  const all = useMemo(() => playersOf(snap), [snap])
  const list = all.filter(p => norm(p.name).includes(norm(q)) || norm(p.club ?? '').includes(norm(q)))
  const shown = limit && !q ? list.slice(0, limit) : list
  return (
    <View style={{ gap: space.md }}>
      <Field label="Chercher un joueur" placeholder="Nom, prénom ou club" value={q} onChangeText={setQ} autoCorrect={false} testID="player-search" style={{ flexBasis: 'auto' }} />
      {all.length === 0
        ? <Empty icon="people-outline" title="Aucun joueur pour le moment" text="La liste se remplit quand les inscriptions sont validées." />
        : shown.length === 0
          ? <Empty icon="search-outline" title="Aucun joueur trouvé" text="Vérifiez l'orthographe ou essayez le nom du club." />
          : (
              <Card pad={0} style={{ overflow: 'hidden' }}>
                {shown.map((p, i) => {
                  const on = selected?.has(p.id)
                  return (
                    <Pressable
                      key={p.id}
                      testID={`player-${p.id}`}
                      accessibilityRole="button"
                      accessibilityLabel={`${p.name}${on ? ', suivi' : ''}`}
                      onPress={() => onPick(p)}
                      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, minHeight: 60, borderBottomWidth: i === shown.length - 1 ? 0 : 1, borderColor: t.line, backgroundColor: pressed ? t.surface2 : on ? t.actionSoft : 'transparent' })}
                    >
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <T v="h3" numberOfLines={1}>{p.name}</T>
                        <T v="small" color={t.muted} numberOfLines={1}>{[p.club, p.categories.join(', ')].filter(Boolean).join(' · ')}</T>
                      </View>
                      <Ionicons name={on ? selectedIcon : actionIcon} size={24} color={on ? t.action : t.muted} />
                    </Pressable>
                  )
                })}
              </Card>
            )}
      {limit && !q && list.length > limit ? <T v="small" color={t.muted}>{list.length - limit} autres joueurs : utilisez la recherche.</T> : null}
    </View>
  )
}
