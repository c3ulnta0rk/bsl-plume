/**
 * Tableaux à élimination directe.
 * Le tableau est construit dès le tirage avec des « sources » : un inscrit connu, une place de poule
 * (« 1er poule A ») ou le vainqueur d'un match précédent. Il se remplit ensuite tout seul.
 */

export type SlotSource
  = { kind: 'entry', entryId: string }
    | { kind: 'pool', pool: number, rank: number }
    | { kind: 'bye' }

export interface BracketMatch {
  /** Tour : 1 = premier tour. */
  round: number
  /** Position dans le tour, à partir de 1. */
  position: number
  source1: SlotSource | null
  source2: SlotSource | null
  /** Match alimenté par le vainqueur. */
  next: { round: number, position: number, side: 1 | 2 } | null
  /** Match pour la 3e place alimenté par le perdant (demi-finales uniquement). */
  loserNext: { round: number, position: number, side: 1 | 2 } | null
  /** Petite finale. */
  thirdPlace: boolean
}

export function nextPowerOfTwo(n: number): number {
  let p = 1
  while (p < n) p *= 2
  return p
}

/** Ordre des têtes de série sur les lignes du tableau. Pour 8 : [1,8,4,5,2,7,3,6]. */
export function seedPositions(size: number): number[] {
  let order = [1]
  while (order.length < size) {
    const n = order.length * 2
    order = order.flatMap(s => [s, n + 1 - s])
  }
  return order
}

export function roundName(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - round
  if (fromEnd === 0) return 'Finale'
  if (fromEnd === 1) return 'Demi-finales'
  if (fromEnd === 2) return 'Quarts de finale'
  if (fromEnd === 3) return '8es de finale'
  if (fromEnd === 4) return '16es de finale'
  return `Tour ${round}`
}

/**
 * Construit un tableau à partir d'une liste ordonnée (du mieux classé au moins bien classé).
 * Les exemptions vont aux mieux classés.
 */
export function buildBracket(ordered: SlotSource[], opts: { thirdPlace?: boolean } = {}): BracketMatch[] {
  const n = ordered.length
  if (n < 2) throw new Error('Il faut au moins deux participants pour un tableau.')
  const size = nextPowerOfTwo(n)
  const rounds = Math.log2(size)
  const lines = seedPositions(size).map(s => (s <= n ? ordered[s - 1]! : { kind: 'bye' } as SlotSource))
  const matches: BracketMatch[] = []
  for (let r = 1; r <= rounds; r++) {
    const count = size / 2 ** r
    for (let p = 1; p <= count; p++) {
      matches.push({
        round: r,
        position: p,
        source1: r === 1 ? lines[(p - 1) * 2]! : null,
        source2: r === 1 ? lines[(p - 1) * 2 + 1]! : null,
        next: r < rounds ? { round: r + 1, position: Math.ceil(p / 2), side: p % 2 === 1 ? 1 : 2 } : null,
        loserNext: null,
        thirdPlace: false
      })
    }
  }
  if (opts.thirdPlace && rounds >= 2) {
    for (const m of matches) {
      if (m.round === rounds - 1) m.loserNext = { round: rounds, position: 2, side: m.position === 1 ? 1 : 2 }
    }
    matches.push({ round: rounds, position: 2, source1: null, source2: null, next: null, loserNext: null, thirdPlace: true })
  }
  return matches
}

/**
 * Ordre d'entrée dans le tableau final pour des qualifiés de poules.
 * Les premiers de poule sont têtes de série ; un deuxième de poule est placé
 * dans la moitié de tableau opposée à celle du premier de sa poule.
 */
export function orderPoolQualifiers(poolCount: number, qualifiersPerPool: number): SlotSource[] {
  const total = poolCount * qualifiersPerPool
  const size = nextPowerOfTwo(total)
  const lines = seedPositions(size)
  const halfOfSeed = (s: number) => (lines.indexOf(s) < size / 2 ? 0 : 1)
  const result: (SlotSource | null)[] = Array.from({ length: total }, () => null)
  for (let p = 0; p < poolCount; p++) result[p] = { kind: 'pool', pool: p, rank: 1 }
  for (let rank = 2; rank <= qualifiersPerPool; rank++) {
    const start = (rank - 1) * poolCount
    const free = Array.from({ length: poolCount }, (_, i) => start + i)
    // les meilleures poules reçoivent les numéros les plus éloignés : ordre inverse
    for (let p = poolCount - 1; p >= 0; p--) {
      const winnerHalf = halfOfSeed(p + 1)
      let idx = free.findIndex(seedIdx => halfOfSeed(seedIdx + 1) !== winnerHalf)
      if (idx === -1) idx = 0
      const seedIdx = free.splice(idx, 1)[0]!
      result[seedIdx] = { kind: 'pool', pool: p, rank }
    }
  }
  return result as SlotSource[]
}
