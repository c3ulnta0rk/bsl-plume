import { asc, eq, inArray } from 'drizzle-orm'
import { describeRules, estimateMatchMinutes, estimateSchedule, roundName, type SchedMatch, type StandingRow } from '@plume/engine'
import { notFound } from '../context'
import type { Db } from '../db'
import { schema } from '../db'
import { poolStandings, rulesFor } from './draw'
import { playerName } from './names'

const { categories, courts, matches, players, poolEntries, pools, registrations, tournaments } = schema

export interface SnapshotEntry {
  id: string
  name: string
  players: { id: string, name: string, club: string | null }[]
  seed: number | null
  withdrawn: boolean
}
export interface SnapshotMatch {
  id: string
  categoryId: string
  phase: 'pool' | 'bracket'
  poolId: string | null
  round: number
  position: number
  number: number
  label: string
  entry1Id: string | null
  entry2Id: string | null
  /** Texte affiché tant que l'adversaire n'est pas connu (« 1er poule A », « Vainqueur match 12 »). */
  placeholder1: string | null
  placeholder2: string | null
  status: schema.MatchStatus
  courtId: string | null
  sets: { a: number, b: number }[]
  winnerSide: 1 | 2 | null
  resultType: schema.MatchResultType | null
  thirdPlace: boolean
  calledAt: number | null
  startedAt: number | null
  endedAt: number | null
  /** Heure de début estimée (ms) pour un match à venir. */
  estimatedStart: number | null
  estimatedCourtId: string | null
  rulesText: string
}
export interface Snapshot {
  tournament: Omit<typeof tournaments.$inferSelect, 'ownerId' | 'createdAt'>
  courts: { id: string, name: string, open: boolean, matchId: string | null }[]
  categories: {
    id: string
    name: string
    discipline: schema.Discipline
    level: string
    maxEntries: number
    position: number
    format: schema.CategoryFormat
    poolRules: typeof categories.$inferSelect['poolRules']
    bracketRules: typeof categories.$inferSelect['bracketRules']
    poolRulesText: string
    bracketRulesText: string
    status: schema.CategoryStatus
    counts: { accepted: number, pending: number, waitlist: number }
    entries: SnapshotEntry[]
    pools: { id: string, name: string, complete: boolean, standings: StandingRow[] }[]
    bracketRounds: { round: number, name: string }[]
  }[]
  matches: SnapshotMatch[]
  serverTime: number
}

const ms = (d: Date | null) => (d ? d.getTime() : null)

export async function buildSnapshot(db: Db, slugOrId: string, now = new Date()): Promise<Snapshot> {
  const [bySlug] = await db.select().from(tournaments).where(eq(tournaments.slug, slugOrId))
  const t = bySlug ?? (await db.select().from(tournaments).where(eq(tournaments.id, slugOrId)))[0]
  if (!t) throw notFound('Tournoi introuvable.')
  const cats = await db.select().from(categories).where(eq(categories.tournamentId, t.id)).orderBy(asc(categories.position))
  const cts = await db.select().from(courts).where(eq(courts.tournamentId, t.id)).orderBy(asc(courts.position))
  const regs = await db.select().from(registrations).where(eq(registrations.tournamentId, t.id)).orderBy(asc(registrations.createdAt))
  const playerIds = [...new Set(regs.flatMap(r => [r.player1Id, r.player2Id]).filter((x): x is string => !!x))]
  const pls = playerIds.length ? await db.select().from(players).where(inArray(players.id, playerIds)) : []
  const pById = new Map(pls.map(p => [p.id, p]))
  const all = await db.select().from(matches).where(eq(matches.tournamentId, t.id)).orderBy(asc(matches.number))
  const catIds = cats.map(c => c.id)
  const pls2 = catIds.length ? await db.select().from(pools).where(inArray(pools.categoryId, catIds)).orderBy(asc(pools.position)) : []
  const pe = pls2.length ? await db.select().from(poolEntries).where(inArray(poolEntries.poolId, pls2.map(p => p.id))) : []
  void pe

  const entryOf = (r: typeof regs[number]): SnapshotEntry => {
    const ps = [r.player1Id, r.player2Id].filter((x): x is string => !!x).map(id => pById.get(id)!).filter(Boolean)
    return {
      id: r.id,
      name: ps.map(playerName).join(' / '),
      players: ps.map(p => ({ id: p.id, name: playerName(p), club: p.club })),
      seed: r.seed,
      withdrawn: r.status === 'withdrawn'
    }
  }
  const regById = new Map(regs.map(r => [r.id, r]))
  const playersOf = (id: string | null) => {
    const r = id ? regById.get(id) : null
    return r ? [r.player1Id, r.player2Id].filter((x): x is string => !!x) : null
  }

  const catOut: Snapshot['categories'] = []
  const poolRounds = new Map<string, number>()
  const bracketRounds = new Map<string, number>()
  for (const c of cats) {
    const cm = all.filter(m => m.categoryId === c.id)
    poolRounds.set(c.id, Math.max(0, ...cm.filter(m => m.phase === 'pool').map(m => m.round)))
    const br = Math.max(0, ...cm.filter(m => m.phase === 'bracket').map(m => m.round))
    bracketRounds.set(c.id, br)
    const st = await poolStandings(db, c)
    const cr = regs.filter(r => r.categoryId === c.id)
    catOut.push({
      id: c.id, name: c.name, discipline: c.discipline, level: c.level, maxEntries: c.maxEntries, position: c.position,
      format: c.format, poolRules: c.poolRules, bracketRules: c.bracketRules,
      poolRulesText: describeRules(c.poolRules), bracketRulesText: describeRules(c.bracketRules), status: c.status,
      counts: {
        accepted: cr.filter(r => r.status === 'accepted').length,
        pending: cr.filter(r => r.status === 'pending').length,
        waitlist: cr.filter(r => r.status === 'waitlist').length
      },
      entries: cr.filter(r => r.status === 'accepted' || r.status === 'withdrawn').map(entryOf),
      pools: pls2.filter(p => p.categoryId === c.id).map((p) => {
        const s = st.find(x => x.poolId === p.id)
        return { id: p.id, name: p.name, complete: s?.complete ?? false, standings: s?.rows ?? [] }
      }),
      bracketRounds: Array.from({ length: br }, (_, i) => ({ round: i + 1, name: roundName(i + 1, br) }))
    })
  }

  const catById = new Map(cats.map(c => [c.id, c]))
  const visible = all.filter(m => m.resultType !== 'bye')
  const feeders = (m: typeof all[number], side: 1 | 2) => all.filter(f => (f.nextMatchId === m.id && f.nextSide === side) || (f.loserNextMatchId === m.id && f.loserNextSide === side))
  const placeholder = (m: typeof all[number], side: 1 | 2): string | null => {
    if ((side === 1 ? m.entry1Id : m.entry2Id)) return null
    const src = side === 1 ? m.source1 : m.source2
    if (src?.kind === 'pool') return `${src.rank === 1 ? '1er' : `${src.rank}e`} poule ${String.fromCharCode(65 + src.pool)}`
    if (src?.kind === 'bye') return 'Exempt'
    const f = feeders(m, side)[0]
    if (!f) return null
    if (f.resultType === 'bye' && f.winnerSide == null) return 'Exempt'
    return `${f.loserNextMatchId === m.id ? 'Perdant' : 'Vainqueur'} match ${f.number}`
  }

  // estimation des horaires
  const sched: SchedMatch[] = visible.map((m) => {
    const c = catById.get(m.categoryId)!
    return {
      id: m.id, status: m.status, number: m.number,
      stage: m.phase === 'pool' ? m.round : (poolRounds.get(c.id) ?? 0) + m.round,
      categoryOrder: c.position,
      players1: playersOf(m.entry1Id), players2: playersOf(m.entry2Id),
      dependsOn: [
        ...all.filter(f => f.nextMatchId === m.id || f.loserNextMatchId === m.id).map(f => f.id),
        ...(m.phase === 'bracket' && (m.source1?.kind === 'pool' || m.source2?.kind === 'pool')
          ? all.filter(f => f.categoryId === m.categoryId && f.phase === 'pool' && f.resultType !== 'bye').map(f => f.id)
          : [])
      ].filter(id => visible.some(v => v.id === id)),
      minutes: estimateMatchMinutes(rulesFor(c, m)),
      courtId: m.courtId, calledAt: ms(m.calledAt), startedAt: ms(m.startedAt), endedAt: ms(m.endedAt)
    }
  })
  const notBefore = [t.settings.pausedUntil, t.status === 'running' ? null : t.settings.startTime].map(x => (x ? Date.parse(x) : 0)).filter(x => !Number.isNaN(x))
  const est = t.status === 'finished' ? [] : estimateSchedule(sched, cts.map(c => ({ id: c.id, open: c.open })), {
    now: now.getTime(), restMinutes: t.settings.restMinutes ?? 10, notBefore: Math.max(0, ...notBefore) || null
  })
  const estById = new Map(est.map(e => [e.matchId, e]))

  const matchOut: SnapshotMatch[] = visible.map((m) => {
    const c = catById.get(m.categoryId)!
    const e = m.status === 'pending' ? estById.get(m.id) : undefined
    const br = bracketRounds.get(c.id) ?? 0
    return {
      id: m.id, categoryId: m.categoryId, phase: m.phase, poolId: m.poolId, round: m.round, position: m.position, number: m.number,
      label: m.phase === 'pool'
        ? (pls2.find(p => p.id === m.poolId)?.name ?? 'Poule')
        : m.thirdPlace ? 'Match pour la 3e place' : roundName(m.round, br).replace(/s de finale$/, ' de finale').replace(/^Demi-finales$/, 'Demi-finale'),
      entry1Id: m.entry1Id, entry2Id: m.entry2Id,
      placeholder1: placeholder(m, 1), placeholder2: placeholder(m, 2),
      status: m.status, courtId: m.courtId, sets: m.sets, winnerSide: m.winnerSide, resultType: m.resultType, thirdPlace: m.thirdPlace,
      calledAt: ms(m.calledAt), startedAt: ms(m.startedAt), endedAt: ms(m.endedAt),
      estimatedStart: e?.start ?? null, estimatedCourtId: e?.courtId ?? null,
      rulesText: describeRules(rulesFor(c, m))
    }
  })

  const { ownerId: _o, createdAt: _c, ...pub } = t
  return {
    tournament: pub,
    courts: cts.map(c => ({ id: c.id, name: c.name, open: c.open, matchId: all.find(m => m.courtId === c.id && (m.status === 'called' || m.status === 'playing'))?.id ?? null })),
    categories: catOut,
    matches: matchOut,
    serverTime: now.getTime()
  }
}
