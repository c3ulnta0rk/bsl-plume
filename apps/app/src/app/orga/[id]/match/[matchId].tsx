import { analyzeScore, setWinner, type ScoringRules } from '@plume/engine'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { matchStatus, ScoreBoard, sideName } from '@/features/match'
import { ActionError, useAction } from '@/features/orga'
import { useTournament } from '@/features/tournament'
import { post } from '@/lib/api'
import { Banner, Button, Card, Chip, Choice, font, radius, Row, Screen, Section, space, T, useTheme, useWide } from '@/ui'

type S = { a: number, b: number }

/** Feuille de match : score en direct point par point, saisie rapide, abandon, forfait, correction. */
export default function ScoreSheet() {
  const t = useTheme()
  const wide = useWide(700)
  const router = useRouter()
  const { id, matchId } = useLocalSearchParams<{ id: string, matchId: string }>()
  const { snap, ctx, idx } = useTournament(id)
  const act = useAction()
  const m = idx.matches.get(matchId)
  const history = useRef<S[][]>([])
  const [quick, setQuick] = useState<{ a: string, b: string }[]>([])
  const [outcome, setOutcome] = useState<'retired' | 'walkover' | null>(null)
  const loaded = useRef<string | null>(null)
  useEffect(() => {
    if (m && loaded.current !== `${m.id}:${m.status}`) {
      loaded.current = `${m.id}:${m.status}`
      setQuick(m.sets.map(s => ({ a: String(s.a), b: String(s.b) })))
    }
  }, [m])
  if (!snap) return null
  if (!m) return <Screen maxWidth={560}><Banner tone="danger" text="Match introuvable." /></Screen>
  const cat = ctx.categoryOf.get(m.categoryId)!
  const rules: ScoringRules = m.phase === 'pool' ? cat.poolRules : cat.bracketRules
  const st = matchStatus(m, ctx)
  const n1 = sideName(m, 1, ctx).name
  const n2 = sideName(m, 2, ctx).name
  const known = !!(m.entry1Id && m.entry2Id)
  const done = m.status === 'completed'
  const back = () => (router.canGoBack() ? router.back() : router.replace(`/orga/${id}` as never))

  const point = (side: 1 | 2) => {
    const sets: S[] = m.sets.map(s => ({ ...s }))
    const last = sets[sets.length - 1]
    if (!last || setWinner(last, rules, sets.length - 1) !== 0) sets.push({ a: 0, b: 0 })
    const cur = sets[sets.length - 1]!
    if (side === 1) cur.a++
    else cur.b++
    history.current.push(m.sets)
    void act.run(`p${side}`, () => post(`/organizer/matches/${m.id}/score`, { sets }))
  }
  const undo = () => {
    const prev = history.current.pop()
    if (prev) void act.run('undo', () => post(`/organizer/matches/${m.id}/score`, { sets: prev }))
  }
  const parsed: S[] = quick.filter(q => q.a.trim() !== '' || q.b.trim() !== '').map(q => ({ a: parseInt(q.a, 10) || 0, b: parseInt(q.b, 10) || 0 }))
  const check = analyzeScore(parsed, rules)
  const setQ = (i: number, k: 'a' | 'b', v: string) => setQuick((q) => {
    const n = Array.from({ length: Math.max(q.length, i + 1) }, (_, j) => q[j] ?? { a: '', b: '' })
    n[i] = { ...n[i]!, [k]: v.replace(/\D/g, '').slice(0, 2) }
    return n
  })
  const saveResult = async () => { if (await act.run('result', () => post(`/organizer/matches/${m.id}/result`, { sets: parsed, resultType: 'normal' }))) back() }
  const saveOutcome = async (winner: 1 | 2) => {
    if (await act.run('outcome', () => post(`/organizer/matches/${m.id}/result`, { resultType: outcome, winner, sets: outcome === 'retired' ? m.sets : [] }))) back()
  }
  const big = (side: 1 | 2, name: string) => (
    <Pressable
      testID={`point-${side}`}
      accessibilityRole="button"
      accessibilityLabel={`Point pour ${name}`}
      disabled={!!act.busy}
      onPress={() => point(side)}
      style={({ pressed }) => ({ flex: 1, minHeight: wide ? 150 : 120, borderRadius: radius.lg, backgroundColor: pressed ? t.action : t.night, alignItems: 'center', justifyContent: 'center', padding: space.md, gap: 4, opacity: act.busy ? 0.7 : 1 })}
    >
      <Text style={{ fontFamily: font.display, fontSize: 54, lineHeight: 56, color: t.volant }}>+1</Text>
      <Text numberOfLines={2} style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16, textAlign: 'center' }}>{name}</Text>
    </Pressable>
  )
  const rows = Math.max(quick.length, done ? 0 : Math.min(rules.bestOf, 2), 1)
  return (
    <Screen maxWidth={860}>
      <Button label="Retour au pilotage" icon="arrow-back" kind="ghost" size="sm" onPress={back} />
      <View style={{ backgroundColor: t.board, borderRadius: radius.lg, padding: wide ? space.xl : space.lg, gap: space.md }}>
        <Row justify="space-between" wrap>
          <Text style={{ color: t.boardMuted, fontSize: 13, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' }}>{cat.name} · {m.label} · n° {m.number}</Text>
          <Chip label={st.label} tone={st.tone} icon={st.icon} />
        </Row>
        <ScoreBoard m={m} ctx={ctx} size={wide ? 'xl' : 'lg'} />
        <Text style={{ color: t.boardMuted, fontSize: 14 }}>{m.rulesText}</Text>
      </View>
      <ActionError error={act.error} />
      {!known ? <Banner tone="warn" icon="hourglass" text="Les deux adversaires ne sont pas encore connus : ce match ne peut pas être joué." /> : null}

      {known && !done && m.status !== 'cancelled'
        ? (
            <Section title="Score en direct">
              {m.status === 'pending' ? <Banner tone="info" text="Ce match n'est pas encore appelé sur un terrain. Vous pouvez quand même saisir son score : il passera en cours." /> : null}
              <Row gap={space.md} align="stretch">{big(1, n1)}{big(2, n2)}</Row>
              <Row wrap>
                <Button label="Annuler le dernier point" icon="arrow-undo" kind="secondary" disabled={history.current.length === 0 || !!act.busy} onPress={undo} testID="undo-point" />
                {m.status === 'called' ? <Button label="Démarrer sans point" icon="play" kind="ghost" onPress={() => void act.run('start', () => post(`/organizer/matches/${m.id}/start`))} /> : null}
              </Row>
            </Section>
          )
        : null}

      {known && m.status !== 'cancelled'
        ? (
            <Section title={done ? 'Corriger le résultat' : 'Saisie rapide du résultat'}>
              <Card style={{ gap: space.md }}>
                <T v="small" color={t.ink2}>Entrez le score de chaque set. {done ? 'La correction se fait selon le format sous lequel le match a été joué.' : ''}</T>
                {Array.from({ length: rows }, (_, i) => (
                  <Row key={i} gap={space.md}>
                    <T v="h3" style={{ width: 52 }}>Set {i + 1}</T>
                    {(['a', 'b'] as const).map(k => (
                      <TextInput
                        key={k}
                        testID={`set-${i + 1}-${k}`}
                        accessibilityLabel={`Set ${i + 1}, ${k === 'a' ? n1 : n2}`}
                        keyboardType="number-pad"
                        value={quick[i]?.[k] ?? ''}
                        onChangeText={v => setQ(i, k, v)}
                        placeholder={k === 'a' ? n1.split(' ')[0] : n2.split(' ')[0]}
                        placeholderTextColor={t.muted}
                        style={{ flex: 1, minWidth: 0, height: 60, borderWidth: 1.5, borderColor: t.line, borderRadius: radius.md, textAlign: 'center', fontFamily: font.display, fontSize: 32, color: t.ink, backgroundColor: t.surface }}
                      />
                    ))}
                  </Row>
                ))}
                {rows < rules.bestOf ? <Button label="Ajouter un set" icon="add" kind="ghost" size="sm" onPress={() => setQuick(q => [...Array.from({ length: rows }, (_, j) => q[j] ?? { a: '', b: '' }), { a: '', b: '' }])} /> : null}
                {parsed.length > 0 && !check.valid ? <Banner tone="danger" text={check.error ?? 'Score invalide.'} /> : null}
                {parsed.length > 0 && check.valid && check.finished ? <Banner tone="success" icon="trophy" text={`Victoire de ${check.winner === 1 ? n1 : n2}, ${check.setsWon[check.winner === 1 ? 0 : 1]} set${check.setsWon[check.winner === 1 ? 0 : 1]! > 1 ? 's' : ''} à ${check.setsWon[check.winner === 1 ? 1 : 0]}.`} /> : null}
                <Button label={done ? 'Enregistrer la correction' : 'Enregistrer le résultat'} icon="checkmark" size="lg" full disabled={!check.valid || !check.finished} loading={act.busy === 'result'} onPress={() => void saveResult()} testID="save-result" />
              </Card>
            </Section>
          )
        : null}

      {known && !done && m.status !== 'cancelled'
        ? (
            <Section title="Le match ne va pas au bout">
              <Card style={{ gap: space.md }}>
                <Choice
                  value={outcome}
                  onChange={setOutcome}
                  options={[{ value: 'retired', label: 'Abandon en cours de match', hint: 'Le score acquis est conservé' }, { value: 'walkover', label: 'Forfait', hint: 'Match non joué' }]}
                />
                {outcome
                  ? (
                      <>
                        <T v="h3">Qui gagne le match ?</T>
                        <Row wrap>
                          <Button label={n1} kind="secondary" loading={act.busy === 'outcome'} onPress={() => void saveOutcome(1)} testID="outcome-1" />
                          <Button label={n2} kind="secondary" loading={act.busy === 'outcome'} onPress={() => void saveOutcome(2)} testID="outcome-2" />
                        </Row>
                        <T v="small" color={t.muted}>Pour retirer un joueur de tout le tableau (blessure, départ), passez par l'onglet Inscriptions, « Retirer du tableau ».</T>
                      </>
                    )
                  : null}
              </Card>
            </Section>
          )
        : null}

      {done
        ? <Button label="Effacer le résultat (match à rejouer)" icon="trash-outline" kind="danger" loading={act.busy === 'reset'} onPress={() => void act.run('reset', () => post(`/organizer/matches/${m.id}/reset`))} testID="reset-result" />
        : null}
    </Screen>
  )
}
