import { DEFAULT_RULES, suggestPoolCount, type ScoringRules } from '@plume/engine'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { ActionError, RulesEditor, useAction } from '@/features/orga'
import { useTournament } from '@/features/tournament'
import { del, patch, post } from '@/lib/api'
import { DISCIPLINES } from '@/lib/format'
import type { Category, CategoryFormat, Discipline } from '@/lib/types'
import { Banner, Button, Card, Chip, Choice, Empty, Field, Row, Screen, Section, Sheet, space, Switcher, T, useTheme } from '@/ui'

interface Draft { id: string | null, name: string, discipline: Discipline, level: string, maxEntries: string, format: CategoryFormat, poolRules: ScoringRules, bracketRules: ScoringRules, status: Category['status'] }
const blank = (): Draft => ({ id: null, name: '', discipline: 'SH', level: '', maxEntries: '16', format: { type: 'pools_bracket', poolSize: 4, qualifiers: 2, thirdPlace: false }, poolRules: DEFAULT_RULES, bracketRules: DEFAULT_RULES, status: 'registration' })

export default function Categories() {
  const t = useTheme()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { snap } = useTournament(id)
  const act = useAction()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [drawing, setDrawing] = useState<Category | null>(null)
  const [poolCount, setPoolCount] = useState(1)
  if (!snap) return null
  const set = (p: Partial<Draft>) => setDraft(d => (d ? { ...d, ...p } : d))
  const save = async () => {
    if (!draft) return
    const body = { name: draft.name || DISCIPLINES[draft.discipline], discipline: draft.discipline, level: draft.level, maxEntries: parseInt(draft.maxEntries, 10) || 2, poolRules: draft.poolRules, bracketRules: draft.bracketRules, ...(draft.status === 'registration' ? { format: draft.format } : {}) }
    const ok = await act.run('save', () => (draft.id ? patch(`/organizer/categories/${draft.id}`, body) : post(`/organizer/tournaments/${id}/categories`, body)))
    if (ok) setDraft(null)
  }
  const openDraw = (c: Category) => { act.clearError(); setPoolCount(suggestPoolCount(c.counts.accepted, c.format.poolSize)); setDrawing(c) }
  const formatText = (c: Category) => (c.format.type === 'bracket' ? 'Élimination directe' : c.format.type === 'pools' ? `Poules de ${c.format.poolSize}` : `Poules de ${c.format.poolSize}, ${c.format.qualifiers} qualifié${c.format.qualifiers > 1 ? 's' : ''} par poule, puis tableau`)
  return (
    <Screen maxWidth={980}>
      {!draft && !drawing ? <ActionError error={act.error} /> : null}
      <Section title="Tableaux" right={<Button label="Nouveau tableau" icon="add" onPress={() => { act.clearError(); setDraft(blank()) }} testID="new-category" />}>
        {snap.categories.length === 0
          ? <Empty icon="grid-outline" title="Aucun tableau" text="Un tableau = une discipline et un niveau : par exemple Simple hommes série B, ou Double mixte." action={<Button label="Créer un tableau" icon="add" onPress={() => setDraft(blank())} />} />
          : snap.categories.map((c) => {
              const played = snap.matches.some(m => m.categoryId === c.id && (m.status !== 'pending' || m.sets.length > 0))
              return (
                <Card key={c.id} testID={`category-${c.name}`} style={{ gap: space.sm }}>
                  <Row justify="space-between" wrap>
                    <View style={{ flex: 1, minWidth: 180 }}>
                      <T v="h2">{c.name}</T>
                      <T v="small" color={t.ink2}>{DISCIPLINES[c.discipline]}{c.level ? ` · ${c.level}` : ''}</T>
                    </View>
                    <Row wrap>
                      <Chip label={`${c.counts.accepted} / ${c.maxEntries} validés`} tone={c.counts.accepted >= c.maxEntries ? 'warn' : 'info'} />
                      {c.counts.pending ? <Chip label={`${c.counts.pending} à valider`} tone="warn" /> : null}
                      <Chip label={c.status === 'registration' ? 'Inscriptions' : c.status === 'drawn' ? 'Tirage fait' : 'Terminé'} tone={c.status === 'registration' ? 'neutral' : c.status === 'drawn' ? 'success' : 'night'} />
                    </Row>
                  </Row>
                  <T v="small" color={t.ink2}>{formatText(c)}{c.format.thirdPlace && c.format.type !== 'pools' ? ', match pour la 3e place' : ''}.</T>
                  <T v="small" color={t.ink2}>{c.format.type !== 'bracket' ? `Poules : ${c.poolRulesText}. ` : ''}{c.format.type !== 'pools' ? `Tableau final : ${c.bracketRulesText}.` : ''}</T>
                  <Row wrap>
                    <Button label={c.status === 'registration' ? 'Modifier' : 'Changer le format de score'} icon="create-outline" size="sm" kind="secondary" onPress={() => { act.clearError(); setDraft({ id: c.id, name: c.name, discipline: c.discipline, level: c.level, maxEntries: String(c.maxEntries), format: c.format, poolRules: c.poolRules, bracketRules: c.bracketRules, status: c.status }) }} testID={`edit-${c.name}`} />
                    {c.status === 'registration'
                      ? <Button label="Faire le tirage" icon="shuffle" size="sm" disabled={c.counts.accepted < 2} onPress={() => openDraw(c)} testID={`draw-${c.name}`} />
                      : !played
                          ? (
                              <>
                                <Button label="Refaire le tirage" icon="shuffle" size="sm" kind="secondary" onPress={() => openDraw(c)} />
                                <Button label="Annuler le tirage" size="sm" kind="ghost" loading={act.busy === `undraw-${c.id}`} onPress={() => void act.run(`undraw-${c.id}`, () => del(`/organizer/categories/${c.id}/draw`))} testID={`undraw-${c.name}`} />
                              </>
                            )
                          : null}
                    {c.status !== 'registration' ? <Button label="Voir le tableau" icon="open-outline" size="sm" kind="ghost" onPress={() => router.push(`/t/${snap.tournament.slug}/tableaux?c=${c.id}` as never)} /> : null}
                    {c.status === 'registration' ? <Button label="Supprimer" size="sm" kind="ghost" onPress={() => void act.run(`del-${c.id}`, () => del(`/organizer/categories/${c.id}`))} /> : null}
                  </Row>
                  {c.status === 'registration' && c.counts.accepted < 2 ? <T v="small" color={t.muted}>Il faut au moins deux inscriptions validées pour tirer ce tableau.</T> : null}
                </Card>
              )
            })}
      </Section>

      <Sheet visible={!!draft} onClose={() => setDraft(null)} title={draft?.id ? `Modifier « ${draft.name} »` : 'Nouveau tableau'} width={680}>
        {draft
          ? (
              <>
                {draft.status !== 'registration' ? <Banner tone="info" icon="information-circle" text="Le tirage est fait : la formule est figée, mais vous pouvez changer le format de score. Le changement s'applique aux matchs pas encore joués, les résultats acquis ne bougent pas." /> : null}
                <Choice label="Discipline" value={draft.discipline} onChange={v => set({ discipline: v })} options={(Object.keys(DISCIPLINES) as Discipline[]).map(d => ({ value: d, label: DISCIPLINES[d] }))} />
                <Row wrap gap={space.md} align="flex-start">
                  <Field label="Nom du tableau" value={draft.name} onChangeText={v => set({ name: v })} placeholder={DISCIPLINES[draft.discipline]} testID="cat-name" />
                  <Field label="Niveau ou série (facultatif)" value={draft.level} onChangeText={v => set({ level: v })} placeholder="R4 à D9, débutants…" />
                </Row>
                <Field label={`Nombre de places (${draft.discipline.startsWith('D') ? 'paires' : 'joueurs'})`} value={draft.maxEntries} onChangeText={v => set({ maxEntries: v.replace(/\D/g, '') })} keyboardType="number-pad" hint="Au-delà, les inscriptions passent en liste d'attente." testID="cat-max" style={{ flexGrow: 0 }} />
                {draft.status === 'registration'
                  ? (
                      <>
                        <Choice label="Formule" value={draft.format.type} onChange={v => set({ format: { ...draft.format, type: v } })} options={[{ value: 'pools_bracket', label: 'Poules puis tableau final' }, { value: 'pools', label: 'Poules seules' }, { value: 'bracket', label: 'Élimination directe' }]} />
                        {draft.format.type !== 'bracket' ? <Choice label="Taille des poules visée" value={draft.format.poolSize} onChange={v => set({ format: { ...draft.format, poolSize: v, qualifiers: Math.min(draft.format.qualifiers, v - 1) } })} options={[3, 4, 5, 6].map(n => ({ value: n, label: `${n}` }))} /> : null}
                        {draft.format.type === 'pools_bracket' ? <Choice label="Qualifiés par poule" value={draft.format.qualifiers} onChange={v => set({ format: { ...draft.format, qualifiers: v } })} options={[1, 2, 3].filter(n => n < draft.format.poolSize).map(n => ({ value: n, label: `${n}` }))} /> : null}
                        {draft.format.type !== 'pools' ? <Switcher value={draft.format.thirdPlace} onChange={v => set({ format: { ...draft.format, thirdPlace: v } })} label="Match pour la 3e place" /> : null}
                      </>
                    )
                  : null}
                {draft.format.type !== 'bracket' ? <RulesEditor label="Format de score des poules" value={draft.poolRules} onChange={r => set({ poolRules: r })} /> : null}
                {draft.format.type !== 'pools' ? <RulesEditor label="Format de score du tableau final" value={draft.bracketRules} onChange={r => set({ bracketRules: r })} /> : null}
                <ActionError error={act.error} />
                <Button label="Enregistrer" icon="checkmark" full size="lg" loading={act.busy === 'save'} onPress={() => void save()} testID="cat-save" />
              </>
            )
          : null}
      </Sheet>

      <Sheet visible={!!drawing} onClose={() => setDrawing(null)} title={drawing ? `Tirage : ${drawing.name}` : ''}>
        {drawing
          ? (
              <>
                <T color={t.ink2}>{drawing.counts.accepted} {drawing.discipline.startsWith('D') ? 'paires' : 'joueurs'} validés. Les têtes de série sont réparties en premier, les autres sont tirés au sort en séparant les joueurs d'un même club.</T>
                {drawing.format.type !== 'bracket'
                  ? <Choice label="Nombre de poules" value={poolCount} onChange={setPoolCount} options={[...new Set([poolCount - 1, poolCount, poolCount + 1, suggestPoolCount(drawing.counts.accepted, drawing.format.poolSize)])].filter(n => n >= 1 && n <= Math.floor(drawing.counts.accepted / 2)).sort((a, b) => a - b).map(n => ({ value: n, label: `${n} poule${n > 1 ? 's' : ''}`, hint: `de ${Math.floor(drawing.counts.accepted / n)}${drawing.counts.accepted % n ? ` ou ${Math.ceil(drawing.counts.accepted / n)}` : ''}` }))} />
                  : null}
                {drawing.counts.pending ? <Banner tone="warn" icon="alert-circle" text={`${drawing.counts.pending} inscription${drawing.counts.pending > 1 ? 's' : ''} encore à valider : elles ne seront pas dans le tirage.`} /> : null}
                <ActionError error={act.error} />
                <Button label="Lancer le tirage" icon="shuffle" full size="lg" loading={act.busy === 'draw'} onPress={async () => { if (await act.run('draw', () => post(`/organizer/categories/${drawing.id}/draw`, drawing.format.type !== 'bracket' ? { poolCount } : {}))) setDrawing(null) }} testID="draw-confirm" />
                <T v="small" color={t.muted}>Tant qu'aucun match n'a commencé, vous pouvez refaire ou annuler le tirage.</T>
              </>
            )
          : null}
      </Sheet>
    </Screen>
  )
}
