import { rng, shuffle } from './random'
import type { ResultType, ScoringRules, SetScore } from './rules'
import { creditedSets } from './rules'

export interface Entrant {
  id: string
  /** Tête de série (1 = meilleure). */
  seed?: number | null
  /** Sert à éviter de mettre des joueurs du même club dans la même poule. */
  club?: string | null
}

/** Nombre de poules conseillé pour une taille de poule visée (poules de 3 à 5 privilégiées). */
export function suggestPoolCount(entrants: number, targetSize = 4): number {
  if (entrants <= 0) return 0
  if (entrants <= targetSize + 1) return 1
  return Math.max(1, Math.round(entrants / targetSize))
}

/**
 * Répartit les inscrits dans les poules.
 * Les têtes de série sont placées en serpentin, les autres sont tirées au sort
 * en séparant autant que possible les joueurs d'un même club.
 */
export function distributeIntoPools(entrants: Entrant[], poolCount: number, seed = 1): string[][] {
  if (poolCount < 1) throw new Error('Il faut au moins une poule.')
  const rand = rng(seed)
  const pools: Entrant[][] = Array.from({ length: poolCount }, () => [])
  const seeded = entrants.filter(e => e.seed != null).sort((x, y) => x.seed! - y.seed!)
  const others = shuffle(entrants.filter(e => e.seed == null), rand)
  seeded.forEach((e, i) => {
    const row = Math.floor(i / poolCount)
    const col = i % poolCount
    pools[row % 2 === 0 ? col : poolCount - 1 - col]!.push(e)
  })
  for (const e of others) {
    const minSize = Math.min(...pools.map(p => p.length))
    const candidates = pools.filter(p => p.length === minSize)
    const clash = (p: Entrant[]) => (e.club ? p.filter(x => x.club && x.club === e.club).length : 0)
    const best = Math.min(...candidates.map(clash))
    const choices = candidates.filter(p => clash(p) === best)
    choices[Math.floor(rand() * choices.length)]!.push(e)
  }
  return pools.map(p => p.map(e => e.id))
}

export interface Pairing { round: number, a: string, b: string }

/** Toutes les rencontres d'une poule, organisées en tours (méthode du cercle). */
export function roundRobin(ids: string[]): Pairing[] {
  const list: (string | null)[] = [...ids]
  if (list.length % 2 === 1) list.push(null)
  const n = list.length
  const out: Pairing[] = []
  for (let r = 0; r < n - 1; r++) {
    for (let i = 0; i < n / 2; i++) {
      const a = list[i]!
      const b = list[n - 1 - i]!
      if (a !== null && b !== null) out.push({ round: r + 1, a, b })
    }
    list.splice(1, 0, list.pop()!)
  }
  return out
}

export interface PoolMatch {
  a: string
  b: string
  /** Vainqueur : 1 = a, 2 = b. null tant que le match n'est pas terminé. */
  winner: 1 | 2 | null
  sets: SetScore[]
  resultType: ResultType
  rules: ScoringRules
}

export interface StandingRow {
  id: string
  rank: number
  played: number
  won: number
  lost: number
  setsFor: number
  setsAgainst: number
  pointsFor: number
  pointsAgainst: number
  /** true si l'égalité n'a pu être tranchée que par tirage au sort (à valider par l'organisateur). */
  tiedByLot: boolean
  withdrawn: boolean
}

interface Tally { played: number, won: number, lost: number, sf: number, sa: number, pf: number, pa: number }

function tally(ids: string[], matches: PoolMatch[]): Map<string, Tally> {
  const t = new Map<string, Tally>(ids.map(id => [id, { played: 0, won: 0, lost: 0, sf: 0, sa: 0, pf: 0, pa: 0 }]))
  for (const m of matches) {
    if (m.winner === null) continue
    const A = t.get(m.a)
    const B = t.get(m.b)
    if (!A || !B) continue
    const sets = creditedSets(m.sets, m.rules, m.resultType, m.winner)
    A.played++
    B.played++
    if (m.winner === 1) { A.won++; B.lost++ } else { B.won++; A.lost++ }
    for (const s of sets) {
      if (s.a > s.b) { A.sf++; B.sa++ } else { B.sf++; A.sa++ }
      A.pf += s.a; A.pa += s.b
      B.pf += s.b; B.pa += s.a
    }
  }
  return t
}

/**
 * Classement d'une poule selon le règlement fédéral :
 * 1. nombre de victoires ;
 * 2. égalité à deux : résultat de la rencontre directe ;
 * 3. égalité à trois ou plus : différence de sets, puis de points, sur l'ensemble de la poule,
 *    en revenant à la rencontre directe dès qu'il ne reste que deux ex æquo ;
 * 4. sinon tirage au sort (signalé pour validation).
 *
 * Les inscrits retirés avec annulation de leurs résultats sont passés dans `withdrawn` :
 * leurs matchs sont ignorés et ils sont classés derniers.
 */
export function computeStandings(ids: string[], matches: PoolMatch[], withdrawn: string[] = [], lotSeed = 1): StandingRow[] {
  const out = new Set(withdrawn)
  const active = ids.filter(id => !out.has(id))
  const kept = matches.filter(m => !out.has(m.a) && !out.has(m.b))
  const all = tally(active, kept)
  const rand = rng(lotSeed)
  const lot = new Set<string>()

  const headToHead = (x: string, y: string): string[] | null => {
    const m = kept.find(k => k.winner !== null && ((k.a === x && k.b === y) || (k.a === y && k.b === x)))
    if (!m) return null
    const w = m.winner === 1 ? m.a : m.b
    return w === x ? [x, y] : [y, x]
  }

  const breakTie = (group: string[], level: 0 | 1): string[] => {
    if (group.length === 1) return group
    if (group.length === 2) {
      const h = headToHead(group[0]!, group[1]!)
      if (h) return h
    }
    const key = (id: string) => {
      const t = all.get(id)!
      return level === 0 ? t.sf - t.sa : t.pf - t.pa
    }
    const sorted = [...group].sort((x, y) => key(y) - key(x))
    const buckets: string[][] = []
    for (const id of sorted) {
      const last = buckets[buckets.length - 1]
      if (last && key(last[0]!) === key(id)) last.push(id)
      else buckets.push([id])
    }
    if (buckets.length === 1) {
      if (level === 0) return breakTie(group, 1)
      if (group.length === 2) {
        const h = headToHead(group[0]!, group[1]!)
        if (h) return h
      }
      const anyPlayed = group.some(id => all.get(id)!.played > 0)
      if (anyPlayed) group.forEach(id => lot.add(id))
      return anyPlayed ? shuffle(group, rand) : group
    }
    return buckets.flatMap(b => (b.length === 1 ? b : b.length === 2 ? breakTie(b, 0) : breakTie(b, level === 0 ? 1 : 1)))
  }

  const byWins = new Map<number, string[]>()
  for (const id of active) {
    const w = all.get(id)!.won
    byWins.set(w, [...(byWins.get(w) ?? []), id])
  }
  const ordered = [...byWins.keys()].sort((x, y) => y - x).flatMap(w => breakTie(byWins.get(w)!, 0))

  const row = (id: string, rank: number, isOut: boolean): StandingRow => {
    const t = all.get(id) ?? { played: 0, won: 0, lost: 0, sf: 0, sa: 0, pf: 0, pa: 0 }
    return {
      id, rank, played: t.played, won: t.won, lost: t.lost,
      setsFor: t.sf, setsAgainst: t.sa, pointsFor: t.pf, pointsAgainst: t.pa,
      tiedByLot: lot.has(id), withdrawn: isOut
    }
  }
  return [
    ...ordered.map((id, i) => row(id, i + 1, false)),
    ...ids.filter(id => out.has(id)).map((id, i) => row(id, ordered.length + i + 1, true))
  ]
}
