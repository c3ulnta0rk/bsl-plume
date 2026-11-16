import { describe, expect, it } from 'vitest'
import {
  analyzeScore, buildBracket, computeStandings, creditedSets, distributeIntoPools, estimateSchedule,
  orderPoolQualifiers, roundRobin, RULES_PRESETS, seedPositions, setWinner, suggestNext, suggestPoolCount,
  type PoolMatch, type SchedMatch, type ScoringRules
} from '../src'

const R21 = RULES_PRESETS.find(p => p.id === 'std-3x21')!.rules
const R15 = RULES_PRESETS.find(p => p.id === 'alt-3x15')!.rules
const R11 = RULES_PRESETS.find(p => p.id === 'alt-5x11')!.rules
const SEC: ScoringRules = { bestOf: 1, pointsPerSet: 15, winByTwo: false, cap: null }

describe('règles de score', () => {
  it('valide les fins de set en 21', () => {
    expect(setWinner({ a: 21, b: 19 }, R21)).toBe(1)
    expect(setWinner({ a: 12, b: 21 }, R21)).toBe(2)
    expect(setWinner({ a: 21, b: 20 }, R21)).toBe(0)
    expect(setWinner({ a: 22, b: 20 }, R21)).toBe(1)
    expect(setWinner({ a: 25, b: 23 }, R21)).toBe(1)
    expect(setWinner({ a: 30, b: 29 }, R21)).toBe(1)
    expect(setWinner({ a: 30, b: 28 }, R21)).toBe(1)
    expect(setWinner({ a: 29, b: 29 }, R21)).toBe(0)
  })
  it('refuse les scores impossibles', () => {
    expect(setWinner({ a: 23, b: 12 }, R21)).toBe(-1)
    expect(setWinner({ a: 31, b: 29 }, R21)).toBe(-1)
    expect(setWinner({ a: 30, b: 20 }, R21)).toBe(-1)
    expect(setWinner({ a: -1, b: 3 }, R21)).toBe(-1)
    expect(setWinner({ a: 16, b: 3 }, SEC)).toBe(-1)
  })
  it('gère le point décisif sans prolongation', () => {
    expect(setWinner({ a: 15, b: 14 }, SEC)).toBe(1)
    expect(setWinner({ a: 14, b: 14 }, SEC)).toBe(0)
  })
  it('gère les formats 3×15 et 5×11', () => {
    expect(setWinner({ a: 21, b: 20 }, R15)).toBe(1)
    expect(setWinner({ a: 15, b: 13 }, R15)).toBe(1)
    expect(setWinner({ a: 15, b: 14 }, R11)).toBe(1)
    expect(analyzeScore([{ a: 11, b: 5 }, { a: 11, b: 9 }, { a: 4, b: 11 }, { a: 11, b: 8 }], R11)).toMatchObject({ finished: true, winner: 1, setsWon: [3, 1] })
  })
  it('applique un set décisif différent', () => {
    const r = RULES_PRESETS.find(p => p.id === 'mix-21-decisif-11')!.rules
    expect(analyzeScore([{ a: 21, b: 10 }, { a: 10, b: 21 }, { a: 11, b: 7 }], r)).toMatchObject({ finished: true, winner: 1 })
    expect(analyzeScore([{ a: 21, b: 10 }, { a: 10, b: 21 }, { a: 21, b: 7 }], r).valid).toBe(false)
  })
  it('analyse un match complet, en cours ou incohérent', () => {
    expect(analyzeScore([{ a: 21, b: 18 }, { a: 19, b: 21 }, { a: 21, b: 15 }], R21)).toMatchObject({ valid: true, finished: true, winner: 1, setsWon: [2, 1], points: [61, 54] })
    expect(analyzeScore([{ a: 21, b: 18 }, { a: 7, b: 3 }], R21)).toMatchObject({ valid: true, finished: false, winner: null })
    expect(analyzeScore([{ a: 21, b: 18 }, { a: 21, b: 3 }, { a: 21, b: 4 }], R21).valid).toBe(false)
    expect(analyzeScore([{ a: 7, b: 3 }, { a: 21, b: 3 }], R21).valid).toBe(false)
    expect(analyzeScore([], R21)).toMatchObject({ valid: true, finished: false })
  })
  it('crédite les sets en cas de forfait et d\'abandon', () => {
    expect(creditedSets([], R21, 'walkover', 2)).toEqual([{ a: 0, b: 21 }, { a: 0, b: 21 }])
    expect(creditedSets([{ a: 21, b: 15 }, { a: 8, b: 11 }], R21, 'retired', 1)).toEqual([{ a: 21, b: 15 }, { a: 21, b: 11 }])
    expect(creditedSets([{ a: 21, b: 15 }, { a: 8, b: 11 }], R21, 'retired', 2)).toEqual([{ a: 21, b: 15 }, { a: 8, b: 21 }, { a: 0, b: 21 }])
    expect(creditedSets([{ a: 20, b: 20 }], R21, 'retired', 1)).toEqual([{ a: 22, b: 20 }, { a: 21, b: 0 }])
  })
})

describe('poules', () => {
  it('propose un nombre de poules cohérent', () => {
    expect(suggestPoolCount(4)).toBe(1)
    expect(suggestPoolCount(12)).toBe(3)
    expect(suggestPoolCount(14)).toBe(4)
    expect(suggestPoolCount(32)).toBe(8)
  })
  it('répartit têtes de série en serpentin et sépare les clubs', () => {
    const entrants = Array.from({ length: 16 }, (_, i) => ({ id: `e${i + 1}`, seed: i < 8 ? i + 1 : null, club: i >= 8 ? (i < 12 ? 'X' : 'Y') : null }))
    const pools = distributeIntoPools(entrants, 4, 42)
    expect(pools.map(p => p.length)).toEqual([4, 4, 4, 4])
    expect(pools.map(p => p[0])).toEqual(['e1', 'e2', 'e3', 'e4'])
    expect(pools.map(p => p[1])).toEqual(['e8', 'e7', 'e6', 'e5'])
    for (const p of pools) {
      expect(p.filter(id => ['e9', 'e10', 'e11', 'e12'].includes(id)).length).toBe(1)
    }
    expect(distributeIntoPools(entrants, 4, 42)).toEqual(pools)
    expect(new Set(pools.flat()).size).toBe(16)
  })
  it('gère des poules de tailles inégales', () => {
    const entrants = Array.from({ length: 10 }, (_, i) => ({ id: `e${i}` }))
    expect(distributeIntoPools(entrants, 3, 7).map(p => p.length).sort()).toEqual([3, 3, 4])
  })
  it('génère toutes les rencontres une seule fois', () => {
    for (const n of [3, 4, 5, 6]) {
      const ids = Array.from({ length: n }, (_, i) => `p${i}`)
      const rr = roundRobin(ids)
      expect(rr.length).toBe(n * (n - 1) / 2)
      expect(new Set(rr.map(m => [m.a, m.b].sort().join('-'))).size).toBe(rr.length)
      for (const r of new Set(rr.map(m => m.round))) {
        const inRound = rr.filter(m => m.round === r).flatMap(m => [m.a, m.b])
        expect(new Set(inRound).size).toBe(inRound.length)
      }
    }
  })
  const pm = (a: string, b: string, sets: [number, number][], extra: Partial<PoolMatch> = {}): PoolMatch => {
    const s = sets.map(([x, y]) => ({ a: x, b: y }))
    const o = analyzeScore(s, R21)
    return { a, b, sets: s, winner: o.winner, resultType: 'normal', rules: R21, ...extra }
  }
  it('classe par victoires puis rencontre directe', () => {
    const st = computeStandings(['A', 'B', 'C', 'D'], [
      pm('A', 'B', [[21, 10], [21, 10]]), pm('C', 'D', [[21, 10], [21, 10]]),
      pm('A', 'C', [[21, 10], [21, 10]]), pm('B', 'D', [[10, 21], [10, 21]]),
      pm('A', 'D', [[10, 21], [10, 21]]), pm('B', 'C', [[21, 19], [21, 19]])
    ])
    // A et D ont 2 victoires : D a battu A. B et C ont 1 victoire : B a battu C.
    expect(st.map(r => r.id)).toEqual(['D', 'A', 'B', 'C'])
    expect(st[0]).toMatchObject({ rank: 1, won: 2, lost: 1 })
  })
  it('départage une égalité à trois à la différence de sets puis de points', () => {
    const st = computeStandings(['A', 'B', 'C'], [
      pm('A', 'B', [[21, 10], [21, 10]]),
      pm('B', 'C', [[21, 15], [15, 21], [21, 15]]),
      pm('C', 'A', [[21, 19], [19, 21], [21, 19]])
    ])
    // sets : A 3-2 (+1), B 2-3 (-1), C 3-3 (0)
    expect(st.map(r => r.id)).toEqual(['A', 'C', 'B'])
    const pts = computeStandings(['A', 'B', 'C'], [
      pm('A', 'B', [[21, 10], [21, 10]]), pm('B', 'C', [[21, 15], [21, 15]]), pm('C', 'A', [[21, 19], [21, 19]])
    ])
    // sets tous à 2-2 ; points : A +18, B -10, C -8
    expect(pts.map(r => r.id)).toEqual(['A', 'C', 'B'])
    expect(pts.every(r => !r.tiedByLot)).toBe(true)
  })
  it('signale un tirage au sort quand tout est égal', () => {
    const st = computeStandings(['A', 'B', 'C'], [
      pm('A', 'B', [[21, 10], [21, 10]]), pm('B', 'C', [[21, 10], [21, 10]]), pm('C', 'A', [[21, 10], [21, 10]])
    ])
    expect(st.every(r => r.tiedByLot)).toBe(true)
  })
  it('ignore les résultats d\'un joueur retiré et compte les forfaits', () => {
    const matches = [
      pm('A', 'B', [[21, 10], [21, 10]]), pm('A', 'C', [[10, 21], [10, 21]]),
      pm('B', 'C', [], { winner: 1, resultType: 'walkover' })
    ]
    const annul = computeStandings(['A', 'B', 'C'], matches, ['C'])
    expect(annul.map(r => r.id)).toEqual(['A', 'B', 'C'])
    expect(annul[2]).toMatchObject({ withdrawn: true, played: 0 })
    expect(annul[0]).toMatchObject({ played: 1, won: 1 })
    const wo = computeStandings(['A', 'B', 'C'], matches)
    expect(wo.find(r => r.id === 'B')).toMatchObject({ won: 1, setsFor: 2, pointsFor: 62 })
  })
})

describe('tableaux', () => {
  it('place les têtes de série', () => {
    expect(seedPositions(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6])
    expect(seedPositions(4)).toEqual([1, 4, 2, 3])
  })
  it('construit un tableau avec exemptions pour les mieux classés', () => {
    const b = buildBracket(Array.from({ length: 6 }, (_, i) => ({ kind: 'entry' as const, entryId: `e${i + 1}` })))
    expect(b.filter(m => m.round === 1).length).toBe(4)
    expect(b.filter(m => m.round === 3).length).toBe(1)
    const r1 = b.filter(m => m.round === 1)
    expect(r1[0]).toMatchObject({ source1: { entryId: 'e1' }, source2: { kind: 'bye' } })
    expect(r1[2]).toMatchObject({ source1: { entryId: 'e2' }, source2: { kind: 'bye' } })
    expect(r1[1]).toMatchObject({ source1: { entryId: 'e4' }, source2: { entryId: 'e5' } })
    expect(r1[0]!.next).toEqual({ round: 2, position: 1, side: 1 })
    expect(r1[3]!.next).toEqual({ round: 2, position: 2, side: 2 })
  })
  it('ajoute la petite finale', () => {
    const b = buildBracket(Array.from({ length: 4 }, (_, i) => ({ kind: 'entry' as const, entryId: `e${i}` })), { thirdPlace: true })
    expect(b.filter(m => m.thirdPlace).length).toBe(1)
    expect(b.filter(m => m.round === 1).every(m => m.loserNext?.position === 2)).toBe(true)
  })
  it('sépare premier et deuxième d\'une même poule dans deux moitiés', () => {
    for (const pools of [2, 3, 4, 6, 8]) {
      const order = orderPoolQualifiers(pools, 2)
      expect(order.length).toBe(pools * 2)
      const b = buildBracket(order)
      const size = b.filter(m => m.round === 1).length * 2
      const half = (pool: number, rank: number) => {
        const m = b.find(x => x.round === 1 && [x.source1, x.source2].some(s => s?.kind === 'pool' && s.pool === pool && s.rank === rank))!
        return m.position <= size / 4 ? 0 : 1
      }
      for (let p = 0; p < pools; p++) expect(half(p, 1)).not.toBe(half(p, 2))
    }
  })
})

describe('planification', () => {
  const now = 1_000_000_000
  const mk = (id: string, stage: number, p1: string, p2: string, extra: Partial<SchedMatch> = {}): SchedMatch => ({
    id, stage, status: 'pending', categoryOrder: 0, players1: [p1], players2: [p2], dependsOn: [], minutes: 30, number: Number(id.slice(1)), ...extra
  })
  it('ne lance jamais deux matchs avec le même joueur', () => {
    const next = suggestNext([mk('m1', 1, 'a', 'b'), mk('m2', 1, 'a', 'c'), mk('m3', 1, 'd', 'e')], 3, { now, restMinutes: 10 })
    expect(next.map(m => m.id)).toEqual(['m1', 'm3'])
  })
  it('fait avancer les tours ensemble et respecte le repos', () => {
    const ms = [
      mk('m1', 1, 'a', 'b', { status: 'completed', endedAt: now - 60_000 }),
      mk('m2', 2, 'a', 'c'), mk('m3', 1, 'd', 'e'), mk('m4', 2, 'f', 'g')
    ]
    expect(suggestNext(ms, 1, { now, restMinutes: 10 })[0]!.id).toBe('m3')
    // a vient de jouer : m4 passe avant m2 ; sans autre choix, le repos est assoupli
    expect(suggestNext(ms, 3, { now, restMinutes: 10 }).map(m => m.id)).toEqual(['m3', 'm4', 'm2'])
  })
  it('ignore les matchs dont les joueurs ne sont pas connus', () => {
    expect(suggestNext([mk('m1', 3, 'a', 'b', { players2: null })], 2, { now, restMinutes: 0 })).toEqual([])
  })
  it('estime les horaires sur plusieurs terrains avec dépendances', () => {
    const ms = [
      mk('m1', 1, 'a', 'b'), mk('m2', 1, 'c', 'd'), mk('m3', 1, 'e', 'f'), mk('m4', 1, 'g', 'h'),
      mk('m5', 2, 'x', 'y', { players1: null, players2: null, dependsOn: ['m1', 'm2'] })
    ]
    const est = estimateSchedule(ms, [{ id: 'c1', open: true }, { id: 'c2', open: true }, { id: 'c3', open: false }], { now, restMinutes: 10, callMinutes: 0 })
    const at = (id: string) => (est.find(e => e.matchId === id)!.start - now) / 60_000
    expect(at('m1')).toBe(0)
    expect(at('m2')).toBe(0)
    expect(at('m3')).toBe(30)
    expect(at('m4')).toBe(30)
    expect(at('m5')).toBe(60)
    expect(est.every(e => e.courtId !== 'c3')).toBe(true)
  })
  it('tient compte des matchs en cours et du repos', () => {
    const ms = [
      mk('m1', 1, 'a', 'b', { status: 'playing', startedAt: now - 10 * 60_000, courtId: 'c1' }),
      mk('m2', 2, 'a', 'c')
    ]
    const est = estimateSchedule(ms, [{ id: 'c1', open: true }], { now, restMinutes: 15, callMinutes: 0 })
    expect((est.find(e => e.matchId === 'm2')!.start - now) / 60_000).toBe(35)
  })
  it('moins de terrains = plus d\'attente', () => {
    const ms = Array.from({ length: 12 }, (_, i) => mk(`m${i + 1}`, 1, `p${i}a`, `p${i}b`))
    const last = (n: number) => Math.max(...estimateSchedule(ms, Array.from({ length: n }, (_, i) => ({ id: `c${i}`, open: true })), { now, restMinutes: 0, callMinutes: 0 }).map(e => e.start))
    expect(last(2)).toBeGreaterThan(last(4))
    expect((last(4) - now) / 60_000).toBe(60)
  })
})
