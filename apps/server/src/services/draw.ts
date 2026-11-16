import { and, asc, eq, inArray } from 'drizzle-orm'
import {
  buildBracket, computeStandings, distributeIntoPools, orderPoolQualifiers, roundRobin, suggestPoolCount,
  type PoolMatch, type ScoringRules, type SlotSource, type StandingRow
} from '@plume/engine'
import { bad, conflict, notFound } from '../context'
import type { Db } from '../db'
import { schema } from '../db'

const { categories, matches, poolEntries, pools, registrations, players } = schema
type Match = typeof matches.$inferSelect
type Category = typeof categories.$inferSelect

export function rulesFor(cat: Pick<Category, 'poolRules' | 'bracketRules'>, m: Pick<Match, 'phase' | 'rules'>): ScoringRules {
  return m.rules ?? (m.phase === 'pool' ? cat.poolRules : cat.bracketRules)
}

/** Classements de toutes les poules d'une catégorie. */
export async function poolStandings(db: Db, cat: Category): Promise<{ poolId: string, position: number, complete: boolean, rows: StandingRow[] }[]> {
  const ps = await db.select().from(pools).where(eq(pools.categoryId, cat.id)).orderBy(asc(pools.position))
  if (ps.length === 0) return []
  const pe = await db.select().from(poolEntries).where(inArray(poolEntries.poolId, ps.map(p => p.id))).orderBy(asc(poolEntries.position))
  const ms = await db.select().from(matches).where(and(eq(matches.categoryId, cat.id), eq(matches.phase, 'pool')))
  const regs = await db.select().from(registrations).where(eq(registrations.categoryId, cat.id))
  const annulled = new Set(regs.filter(r => r.status === 'withdrawn' && r.withdrawMode === 'annul').map(r => r.id))
  return ps.map((p) => {
    const ids = pe.filter(e => e.poolId === p.id).map(e => e.registrationId)
    const pm = ms.filter(m => m.poolId === p.id)
    const poolMatches: PoolMatch[] = pm.filter(m => m.status === 'completed' && m.winnerSide && m.entry1Id && m.entry2Id).map(m => ({
      a: m.entry1Id!, b: m.entry2Id!, winner: m.winnerSide!, sets: m.sets,
      resultType: m.resultType === 'bye' ? 'walkover' : (m.resultType ?? 'normal'), rules: rulesFor(cat, m)
    }))
    const rows = computeStandings(ids, poolMatches, ids.filter(i => annulled.has(i)), cat.drawSeed ?? 1)
    const complete = pm.length > 0 && pm.every(m => m.status === 'completed' || m.status === 'cancelled')
    return { poolId: p.id, position: p.position, complete, rows }
  })
}

/**
 * Tirage au sort d'une catégorie : poules, matchs de poule et tableau final (avec ses places à remplir).
 * Rejouable : la graine est conservée.
 */
export async function drawCategory(db: Db, categoryId: string, opts: { poolCount?: number, seed?: number } = {}): Promise<void> {
  await db.transaction(async (tx) => {
    const [cat] = await tx.select().from(categories).where(eq(categories.id, categoryId))
    if (!cat) throw notFound('Catégorie introuvable.')
    const existing = await tx.select().from(matches).where(eq(matches.categoryId, categoryId))
    if (existing.some(m => (m.status !== 'pending' && m.resultType !== 'bye') || m.sets.length > 0)) {
      throw conflict('Des matchs ont déjà commencé : le tirage ne peut plus être refait. Utilisez les imprévus pour ajuster.')
    }
    await tx.delete(matches).where(eq(matches.categoryId, categoryId))
    await tx.delete(pools).where(eq(pools.categoryId, categoryId))

    const regs = await tx.select({ r: registrations, club: players.club }).from(registrations)
      .innerJoin(players, eq(players.id, registrations.player1Id))
      .where(and(eq(registrations.categoryId, categoryId), eq(registrations.status, 'accepted')))
      .orderBy(asc(registrations.createdAt))
    if (regs.length < 2) throw bad('Il faut au moins deux inscriptions validées pour faire le tirage.')
    const seed = opts.seed ?? Math.floor(Math.random() * 1_000_000) + 1
    const entrants = regs.map(x => ({ id: x.r.id, seed: x.r.seed, club: x.club }))
    const last = await tx.select({ n: matches.number }).from(matches).where(eq(matches.tournamentId, cat.tournamentId))
    let number = Math.max(0, ...last.map(l => l.n))
    const rows: (typeof matches.$inferInsert)[] = []
    const fmt = cat.format
    let poolCount = 0

    if (fmt.type !== 'bracket') {
      poolCount = Math.min(Math.max(1, opts.poolCount ?? suggestPoolCount(entrants.length, fmt.poolSize)), Math.floor(entrants.length / 2) || 1)
      const dist = distributeIntoPools(entrants, poolCount, seed)
      const poolIds: string[] = []
      for (let i = 0; i < dist.length; i++) {
        const [p] = await tx.insert(pools).values({ categoryId, name: `Poule ${String.fromCharCode(65 + i)}`, position: i }).returning()
        poolIds.push(p!.id)
        await tx.insert(poolEntries).values(dist[i]!.map((rid, k) => ({ poolId: p!.id, registrationId: rid, position: k })))
      }
      // numérotation tour par tour, toutes poules confondues : c'est l'ordre naturel de passage
      const all = dist.flatMap((ids, i) => roundRobin(ids).map(pr => ({ ...pr, poolId: poolIds[i]! })))
      const maxRound = Math.max(...all.map(a => a.round))
      for (let r = 1; r <= maxRound; r++) {
        let pos = 0
        for (const pr of all.filter(a => a.round === r)) {
          rows.push({ tournamentId: cat.tournamentId, categoryId, phase: 'pool', poolId: pr.poolId, round: r, position: ++pos, number: ++number, entry1Id: pr.a, entry2Id: pr.b })
        }
      }
    }

    if (fmt.type !== 'pools') {
      let ordered: SlotSource[]
      if (fmt.type === 'bracket') {
        const seeded = entrants.filter(e => e.seed != null).sort((a, b) => a.seed! - b.seed!)
        const rest = distributeIntoPools(entrants.filter(e => e.seed == null), 1, seed)[0] ?? []
        ordered = [...seeded.map(e => e.id), ...rest].map(entryId => ({ kind: 'entry', entryId }))
      } else {
        const q = Math.max(1, Math.min(fmt.qualifiers, fmt.poolSize))
        ordered = poolCount * q >= 2 ? orderPoolQualifiers(poolCount, q) : []
      }
      if (ordered.length >= 2) {
        const bm = buildBracket(ordered, { thirdPlace: fmt.thirdPlace })
        const ids = new Map(bm.map(m => [`${m.round}-${m.position}`, crypto.randomUUID()]))
        for (const m of bm) {
          rows.push({
            id: ids.get(`${m.round}-${m.position}`)!,
            tournamentId: cat.tournamentId, categoryId, phase: 'bracket', round: m.round, position: m.position, number: ++number,
            source1: m.source1, source2: m.source2,
            entry1Id: m.source1?.kind === 'entry' ? m.source1.entryId : null,
            entry2Id: m.source2?.kind === 'entry' ? m.source2.entryId : null,
            thirdPlace: m.thirdPlace,
            nextMatchId: m.next ? ids.get(`${m.next.round}-${m.next.position}`)! : null, nextSide: m.next?.side ?? null,
            loserNextMatchId: m.loserNext ? ids.get(`${m.loserNext.round}-${m.loserNext.position}`)! : null, loserNextSide: m.loserNext?.side ?? null
          })
        }
      }
    }
    for (let i = 0; i < rows.length; i += 200) await tx.insert(matches).values(rows.slice(i, i + 200))
    await tx.update(categories).set({ status: 'drawn', drawSeed: seed }).where(eq(categories.id, categoryId))
    await settleCategory(tx as unknown as Db, categoryId)
  })
}

export async function resetDraw(db: Db, categoryId: string): Promise<void> {
  const existing = await db.select().from(matches).where(eq(matches.categoryId, categoryId))
  if (existing.some(m => (m.status !== 'pending' && m.resultType !== 'bye') || m.sets.length > 0)) {
    throw conflict('Des matchs ont déjà commencé : impossible d\'annuler le tirage.')
  }
  await db.delete(matches).where(eq(matches.categoryId, categoryId))
  await db.delete(pools).where(eq(pools.categoryId, categoryId))
  await db.update(categories).set({ status: 'registration', drawSeed: null }).where(eq(categories.id, categoryId))
}

/**
 * Remet la catégorie dans un état cohérent après n'importe quel changement :
 * places de poule reportées dans le tableau, exemptions et forfaits résolus, vainqueurs propagés.
 * Idempotent : on peut l'appeler autant de fois que nécessaire.
 */
export async function settleCategory(db: Db, categoryId: string): Promise<void> {
  const [cat] = await db.select().from(categories).where(eq(categories.id, categoryId))
  if (!cat) return
  const regs = await db.select().from(registrations).where(eq(registrations.categoryId, categoryId))
  const withdrawn = new Set(regs.filter(r => r.status === 'withdrawn').map(r => r.id))
  const standings = await poolStandings(db, cat)
  for (let guard = 0; guard < 64; guard++) {
    const ms = await db.select().from(matches).where(and(eq(matches.categoryId, categoryId), eq(matches.phase, 'bracket')))
    const byId = new Map(ms.map(m => [m.id, m]))
    let changed = false
    const patch = async (m: Match, set: Partial<Match>) => {
      await db.update(matches).set(set).where(eq(matches.id, m.id))
      Object.assign(m, set)
      changed = true
    }
    // 1. places de poule
    for (const m of ms) {
      if (m.status !== 'pending' && m.resultType !== 'bye') continue
      for (const side of [1, 2] as const) {
        const src = side === 1 ? m.source1 : m.source2
        if (src?.kind !== 'pool') continue
        const pool = standings.find(s => s.position === src.pool)
        const row = pool?.complete ? pool.rows.filter(r => !r.withdrawn)[src.rank - 1] : undefined
        const want = row?.id ?? null
        const cur = side === 1 ? m.entry1Id : m.entry2Id
        if (cur !== want) {
          await patch(m, { ...(side === 1 ? { entry1Id: want } : { entry2Id: want }), ...(m.resultType === 'bye' ? { status: 'pending', resultType: null, winnerSide: null, endedAt: null } : {}) })
        }
      }
    }
    // 2. côté vide définitif : exemption, ou place de poule que personne n'occupera
    const emptyForever = (m: Match, side: 1 | 2): boolean => {
      const src = side === 1 ? m.source1 : m.source2
      const entry = side === 1 ? m.entry1Id : m.entry2Id
      if (entry) return false
      if (src?.kind === 'bye') return true
      if (src?.kind === 'pool') {
        const pool = standings.find(s => s.position === src.pool)
        return !!pool?.complete
      }
      if (!src) {
        // alimenté par des matchs précédents : vide seulement si le match source est terminé sans vainqueur
        const feeders = ms.filter(f => (f.nextMatchId === m.id && f.nextSide === side) || (f.loserNextMatchId === m.id && f.loserNextSide === side))
        if (feeders.length === 0) return false
        return feeders.every((f) => {
          if (f.status !== 'completed') return false
          const w = f.winnerSide === 1 ? f.entry1Id : f.winnerSide === 2 ? f.entry2Id : null
          const l = f.resultType === 'bye' ? null : f.winnerSide === 1 ? f.entry2Id : f.winnerSide === 2 ? f.entry1Id : null
          return (f.nextMatchId === m.id && f.nextSide === side ? w : l) == null
        })
      }
      return false
    }
    for (const m of ms) {
      if (m.status !== 'pending') continue
      const e1 = emptyForever(m, 1)
      const e2 = emptyForever(m, 2)
      const w1 = !!m.entry1Id && withdrawn.has(m.entry1Id)
      const w2 = !!m.entry2Id && withdrawn.has(m.entry2Id)
      const now = new Date()
      if (e1 && e2) await patch(m, { status: 'completed', resultType: 'bye', winnerSide: null, endedAt: now })
      else if (e1 && m.entry2Id) await patch(m, { status: 'completed', resultType: 'bye', winnerSide: 2, endedAt: now })
      else if (e2 && m.entry1Id) await patch(m, { status: 'completed', resultType: 'bye', winnerSide: 1, endedAt: now })
      else if (m.entry1Id && m.entry2Id && (w1 || w2)) {
        await patch(m, { status: 'completed', resultType: 'walkover', winnerSide: w1 ? 2 : 1, endedAt: now, rules: rulesFor(cat, m) })
      }
    }
    // 3. propagation des vainqueurs (et perdants vers la petite finale)
    for (const m of ms) {
      if (m.status !== 'completed') continue
      const winner = m.winnerSide === 1 ? m.entry1Id : m.winnerSide === 2 ? m.entry2Id : null
      const loser = m.resultType === 'bye' ? null : m.winnerSide === 1 ? m.entry2Id : m.winnerSide === 2 ? m.entry1Id : null
      for (const [targetId, side, who] of [[m.nextMatchId, m.nextSide, winner], [m.loserNextMatchId, m.loserNextSide, loser]] as const) {
        if (!targetId || !side) continue
        const t = byId.get(targetId)
        if (!t) continue
        const cur = side === 1 ? t.entry1Id : t.entry2Id
        if (cur === who) continue
        if (t.status === 'pending' || t.resultType === 'bye') {
          await patch(t, { ...(side === 1 ? { entry1Id: who } : { entry2Id: who }), ...(t.resultType === 'bye' ? { status: 'pending', resultType: null, winnerSide: null, endedAt: null } : {}) })
        }
      }
    }
    if (!changed) break
  }
  // catégorie terminée ?
  const all = await db.select().from(matches).where(eq(matches.categoryId, categoryId))
  if (all.length > 0) {
    const done = all.every(m => m.status === 'completed' || m.status === 'cancelled')
    const want = done ? 'finished' : 'drawn'
    if (cat.status !== want) await db.update(categories).set({ status: want }).where(eq(categories.id, categoryId))
  }
}
