import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { describeRules, RULES_PRESETS, type ScoringRules } from '@plume/engine'
import { View } from 'react-native'
import { get } from '@/lib/api'
import { useSession } from '@/lib/session'
import type { OrgRegistration } from '@/lib/types'
import { Banner, Choice, Field, Row, space, Switcher, T, useTheme } from '@/ui'

/** Lance une action serveur, affiche l'erreur éventuelle, puis rafraîchit les données. */
export function useAction() {
  const qc = useQueryClient()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const run = useCallback(async (key: string, fn: () => Promise<unknown>): Promise<boolean> => {
    setBusy(key)
    setError(null)
    try {
      await fn()
      await qc.invalidateQueries()
      return true
    } catch (e) {
      setError((e as Error).message)
      return false
    } finally {
      setBusy(null)
    }
  }, [qc])
  return { run, busy, error, clearError: () => setError(null) }
}

export function ActionError({ error }: { error: string | null }) {
  return error ? <Banner tone="danger" icon="alert-circle" text={error} /> : null
}

const same = (a: ScoringRules, b: ScoringRules) => a.bestOf === b.bestOf && a.pointsPerSet === b.pointsPerSet && a.winByTwo === b.winByTwo && a.cap === b.cap && (a.decidingSetPoints ?? null) === (b.decidingSetPoints ?? null)

/** Choix du format de score : préréglages fédéraux, ou réglage libre. */
export function RulesEditor({ label, value, onChange }: { label: string, value: ScoringRules, onChange: (r: ScoringRules) => void }) {
  const t = useTheme()
  const preset = RULES_PRESETS.find(p => same(p.rules, value))
  const [custom, setCustom] = useState(!preset)
  const num = (s: string, min: number, fallback: number) => { const n = parseInt(s, 10); return Number.isFinite(n) && n >= min ? n : fallback }
  return (
    <View style={{ gap: space.sm }}>
      <T v="h3">{label}</T>
      <Choice
        value={custom ? 'custom' : preset?.id ?? 'custom'}
        onChange={(id) => {
          if (id === 'custom') return setCustom(true)
          setCustom(false)
          onChange(RULES_PRESETS.find(p => p.id === id)!.rules)
        }}
        options={[...RULES_PRESETS.map(p => ({ value: p.id, label: p.label, hint: p.federation === 'Libre' ? 'Format libre' : 'Officiel' })), { value: 'custom', label: 'Réglage libre' }]}
      />
      {custom
        ? (
            <View style={{ gap: space.md, padding: space.md, borderWidth: 1, borderColor: t.line, borderRadius: 12 }}>
              <Choice label="Nombre de sets" value={value.bestOf} onChange={v => onChange({ ...value, bestOf: v })} options={[{ value: 1 as const, label: '1 set' }, { value: 3 as const, label: '2 sets gagnants' }, { value: 5 as const, label: '3 sets gagnants' }]} />
              <Row wrap gap={space.md} align="flex-start">
                <Field label="Points par set" keyboardType="number-pad" value={String(value.pointsPerSet)} onChangeText={s => onChange({ ...value, pointsPerSet: num(s, 1, value.pointsPerSet), cap: value.cap && value.cap <= num(s, 1, value.pointsPerSet) ? null : value.cap })} style={{ flexBasis: 140 }} />
                {value.winByTwo ? <Field label="Plafond (vide = aucun)" keyboardType="number-pad" value={value.cap ? String(value.cap) : ''} onChangeText={s => onChange({ ...value, cap: s.trim() ? num(s, 1, value.cap ?? value.pointsPerSet + 9) : null })} style={{ flexBasis: 140 }} /> : null}
                {value.bestOf > 1 ? <Field label="Set décisif en (vide = identique)" keyboardType="number-pad" value={value.decidingSetPoints ? String(value.decidingSetPoints) : ''} onChangeText={s => onChange({ ...value, decidingSetPoints: s.trim() ? num(s, 1, 11) : null, decidingSetCap: s.trim() ? num(s, 1, 11) + 4 : null })} style={{ flexBasis: 140 }} /> : null}
              </Row>
              <Switcher value={value.winByTwo} onChange={v => onChange({ ...value, winByTwo: v, cap: v ? value.cap : null })} label="Deux points d'écart (prolongations)" />
            </View>
          )
        : null}
      <T v="small" color={t.ink2}>{preset && !custom ? preset.description : `${describeRules(value)}.`}</T>
    </View>
  )
}

/** Inscriptions complètes (coordonnées comprises), réservées aux organisateurs. */
export function useOrgRegistrations(id: string | undefined) {
  const { user } = useSession()
  return useQuery({ queryKey: ['t', id, 'registrations'], enabled: !!user && !!id, queryFn: () => get<OrgRegistration[]>(`/organizer/tournaments/${id}/registrations`) })
}
