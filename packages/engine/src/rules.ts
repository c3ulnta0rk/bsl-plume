/**
 * Règles de score : formats officiels proposés en préréglages, entièrement modifiables.
 * Tout est exprimé en données pour qu'un organisateur puisse changer de format en cours de tournoi.
 */

export interface ScoringRules {
  /** Nombre maximal de sets (1, 3 ou 5). Le match se gagne à la majorité. */
  bestOf: 1 | 3 | 5
  /** Points à atteindre pour gagner un set. */
  pointsPerSet: number
  /** Deux points d'écart nécessaires (prolongations). */
  winByTwo: boolean
  /** Plafond : à ce score le set est gagné même avec un seul point d'écart. null = pas de plafond. */
  cap: number | null
  /** Set décisif différent (ex. set décisif en 11). */
  decidingSetPoints?: number | null
  decidingSetCap?: number | null
}

export interface SetScore { a: number, b: number }

export type ResultType = 'normal' | 'retired' | 'walkover'

export interface RulesPreset {
  id: string
  label: string
  description: string
  federation: 'BWF' | 'FFBaD' | 'Libre'
  rules: ScoringRules
}

export const RULES_PRESETS: RulesPreset[] = [
  {
    id: 'std-3x21',
    label: '2 sets gagnants de 21',
    description: 'Format historique : 2 sets gagnants de 21 points, 2 points d\'écart, plafond à 30. Officiel BWF jusqu\'au 3 janvier 2027, il reste autorisé ensuite pour les compétitions nationales et locales.',
    federation: 'BWF',
    rules: { bestOf: 3, pointsPerSet: 21, winByTwo: true, cap: 30 }
  },
  {
    id: 'alt-3x15',
    label: '2 sets gagnants de 15',
    description: 'Nouveau format officiel BWF à compter du 4 janvier 2027 (voté le 25 avril 2026) : 2 sets gagnants de 15 points, 2 points d\'écart, plafond à 21. Vérifiez la date d\'application retenue par votre fédération nationale.',
    federation: 'BWF',
    rules: { bestOf: 3, pointsPerSet: 15, winByTwo: true, cap: 21 }
  },
  {
    id: 'alt-5x11',
    label: '3 sets gagnants de 11',
    description: 'Format 5×11 testé par la BWF : 3 sets gagnants de 11 points, 2 points d\'écart, plafond à 15.',
    federation: 'Libre',
    rules: { bestOf: 5, pointsPerSet: 11, winByTwo: true, cap: 15 }
  },
  {
    id: 'short-1x21',
    label: '1 set de 21',
    description: 'Set unique de 21 points, 2 points d\'écart, plafond à 30. Utile quand le tournoi prend du retard.',
    federation: 'Libre',
    rules: { bestOf: 1, pointsPerSet: 21, winByTwo: true, cap: 30 }
  },
  {
    id: 'short-1x15-sec',
    label: '1 set de 15 sec',
    description: 'Set unique de 15 points, point décisif à 14 partout (pas de prolongation).',
    federation: 'Libre',
    rules: { bestOf: 1, pointsPerSet: 15, winByTwo: false, cap: null }
  },
  {
    id: 'mix-21-decisif-11',
    label: '2 sets de 21, décisif en 11',
    description: '2 sets gagnants de 21, le troisième set se joue en 11 points (plafond à 15).',
    federation: 'Libre',
    rules: { bestOf: 3, pointsPerSet: 21, winByTwo: true, cap: 30, decidingSetPoints: 11, decidingSetCap: 15 }
  }
]

export const DEFAULT_RULES: ScoringRules = RULES_PRESETS[0]!.rules

export function setsToWin(rules: ScoringRules): number {
  return Math.floor(rules.bestOf / 2) + 1
}

/** Cible et plafond applicables au set d'indice donné (0 = premier set). */
export function setTarget(rules: ScoringRules, setIndex: number): { target: number, cap: number | null } {
  const deciding = rules.bestOf > 1 && setIndex === rules.bestOf - 1
  if (deciding && rules.decidingSetPoints) {
    return { target: rules.decidingSetPoints, cap: rules.decidingSetCap ?? null }
  }
  return { target: rules.pointsPerSet, cap: rules.cap }
}

/** 1 ou 2 si le set est gagné, 0 s'il est encore en cours, -1 si le score est impossible. */
export function setWinner(set: SetScore, rules: ScoringRules, setIndex = 0): 0 | 1 | 2 | -1 {
  const { a, b } = set
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) return -1
  const { target, cap } = setTarget(rules, setIndex)
  const hi = Math.max(a, b)
  const lo = Math.min(a, b)
  const side = a > b ? 1 : 2
  if (hi < target) return 0
  if (!rules.winByTwo) return hi === target && lo < target ? side : -1
  if (cap !== null && hi > cap) return -1
  const diff = hi - lo
  if (hi === target) return diff >= 2 ? side : (cap === target ? side : 0)
  // au-delà de la cible : uniquement atteignable par prolongation
  if (cap !== null && hi === cap) return diff === 1 || diff === 2 ? side : -1
  if (diff === 2) return side
  if (diff < 2) return 0
  return -1
}

export interface MatchOutcome {
  valid: boolean
  finished: boolean
  winner: 1 | 2 | null
  setsWon: [number, number]
  points: [number, number]
  error?: string
}

/** Analyse une feuille de score (éventuellement en cours). */
export function analyzeScore(sets: SetScore[], rules: ScoringRules): MatchOutcome {
  const need = setsToWin(rules)
  const setsWon: [number, number] = [0, 0]
  const points: [number, number] = [0, 0]
  const fail = (error: string): MatchOutcome => ({ valid: false, finished: false, winner: null, setsWon, points, error })
  if (sets.length > rules.bestOf) return fail(`Trop de sets : ${rules.bestOf} au maximum.`)
  for (let i = 0; i < sets.length; i++) {
    const s = sets[i]!
    if (setsWon[0] === need || setsWon[1] === need) return fail('Le match était déjà gagné avant ce set.')
    const w = setWinner(s, rules, i)
    if (w === -1) {
      const { target, cap } = setTarget(rules, i)
      return fail(`Set ${i + 1} : ${s.a}-${s.b} est impossible (set en ${target}${rules.winByTwo ? `, 2 points d'écart${cap ? `, plafond ${cap}` : ''}` : ' sec'}).`)
    }
    points[0] += s.a
    points[1] += s.b
    if (w === 0) {
      if (i !== sets.length - 1) return fail(`Set ${i + 1} : ${s.a}-${s.b} n'est pas terminé.`)
      return { valid: true, finished: false, winner: null, setsWon, points }
    }
    setsWon[w - 1]!++
  }
  const winner = setsWon[0] === need ? 1 : setsWon[1] === need ? 2 : null
  return { valid: true, finished: winner !== null, winner, setsWon, points }
}

/**
 * Sets crédités pour les classements.
 * - Forfait (WO) : le vainqueur gagne tous ses sets sur le score cible à 0.
 * - Abandon : les points acquis sont conservés, le vainqueur est crédité des points manquants.
 */
export function creditedSets(sets: SetScore[], rules: ScoringRules, resultType: ResultType, winner: 1 | 2): SetScore[] {
  if (resultType === 'normal') return sets
  const need = setsToWin(rules)
  const out: SetScore[] = []
  let won = 0
  const src = resultType === 'walkover' ? [] : sets
  for (let i = 0; i < src.length && won < need; i++) {
    const s = src[i]!
    const w = setWinner(s, rules, i)
    if (w === 1 || w === 2) {
      out.push({ ...s })
      if (w === winner) won++
      continue
    }
    // set interrompu : on complète pour le vainqueur
    const { target } = setTarget(rules, i)
    const loserPts = winner === 1 ? s.b : s.a
    const winPts = Math.max(target, rules.winByTwo ? loserPts + 2 : loserPts + 1, winner === 1 ? s.a : s.b)
    out.push(winner === 1 ? { a: winPts, b: loserPts } : { a: loserPts, b: winPts })
    won++
  }
  for (let i = out.length; won < need; i++, won++) {
    const { target } = setTarget(rules, i)
    out.push(winner === 1 ? { a: target, b: 0 } : { a: 0, b: target })
  }
  return out
}

/** Durée moyenne estimée d'un match, en minutes, mise en place comprise. */
export function estimateMatchMinutes(rules: ScoringRules): number {
  const avgSets = rules.bestOf === 1 ? 1 : rules.bestOf === 3 ? 2.35 : 3.7
  const perPoint = 0.62 // minute par point de la cible, échanges des deux côtés compris
  return Math.round(avgSets * rules.pointsPerSet * perPoint + 6)
}

export function describeRules(r: ScoringRules): string {
  const n = setsToWin(r)
  let s = r.bestOf === 1 ? `1 set de ${r.pointsPerSet}` : `${n} sets gagnants de ${r.pointsPerSet}`
  if (r.winByTwo) s += r.cap ? `, 2 points d'écart, plafond à ${r.cap}` : ', 2 points d\'écart'
  else s += ', point décisif (sec)'
  if (r.decidingSetPoints) s += `, set décisif en ${r.decidingSetPoints}`
  return s
}
