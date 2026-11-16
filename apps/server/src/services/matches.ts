import { and, eq, inArray, ne } from 'drizzle-orm'
import { analyzeScore, type SetScore } from '@plume/engine'
import { bad, conflict, notFound, type Ctx } from '../context'
import { schema } from '../db'
import { rulesFor, settleCategory } from './draw'

const { categories, courts, matches } = schema
type Match = typeof matches.$inferSelect

async function load(ctx: Ctx, matchId: string) {
  const [m] = await ctx.db.select().from(matches).where(eq(matches.id, matchId))
  if (!m) throw notFound('Match introuvable.')
  const [cat] = await ctx.db.select().from(categories).where(eq(categories.id, m.categoryId))
  return { m, cat: cat! }
}

/** Appelle un match sur un terrain. */
export async function callMatch(ctx: Ctx, matchId: string, courtId: string): Promise<Match> {
  const { m } = await load(ctx, matchId)
  if (m.status !== 'pending' && m.status !== 'called') throw conflict('Ce match est déjà lancé ou terminé.')
  if (!m.entry1Id || !m.entry2Id) throw bad('Les deux adversaires ne sont pas encore connus.')
  const [court] = await ctx.db.select().from(courts).where(and(eq(courts.id, courtId), eq(courts.tournamentId, m.tournamentId)))
  if (!court) throw notFound('Terrain introuvable.')
  if (!court.open) throw conflict(`${court.name} est fermé.`)
  const occupied = await ctx.db.select().from(matches).where(and(eq(matches.courtId, courtId), inArray(matches.status, ['called', 'playing']), ne(matches.id, matchId)))
  if (occupied.length > 0) throw conflict(`${court.name} est déjà occupé.`)
  const active = await ctx.db.select().from(matches).where(and(eq(matches.tournamentId, m.tournamentId), inArray(matches.status, ['called', 'playing']), ne(matches.id, matchId)))
  const entryIds = [...new Set([m.entry1Id, m.entry2Id, ...active.flatMap(a => [a.entry1Id, a.entry2Id])].filter((x): x is string => !!x))]
  const regs = await ctx.db.select().from(schema.registrations).where(inArray(schema.registrations.id, entryIds))
  const playersOf = (id: string | null) => { const r = regs.find(x => x.id === id); return r ? [r.player1Id, r.player2Id].filter((x): x is string => !!x) : [] }
  const mine = new Set([...playersOf(m.entry1Id), ...playersOf(m.entry2Id)])
  const clash = active.find(a => [...playersOf(a.entry1Id), ...playersOf(a.entry2Id)].some(p => mine.has(p)))
  if (clash) throw conflict(`Un des joueurs est déjà sur un terrain (match n° ${clash.number}).`)
  const [u] = await ctx.db.update(matches).set({ status: 'called', courtId, calledAt: ctx.now() }).where(eq(matches.id, matchId)).returning()
  return u!
}

/** Annule un appel : le match retourne dans la file d'attente. */
export async function uncallMatch(ctx: Ctx, matchId: string): Promise<Match> {
  const { m } = await load(ctx, matchId)
  if (m.status !== 'called' && m.status !== 'playing') throw conflict('Ce match n\'est pas sur un terrain.')
  const [u] = await ctx.db.update(matches).set({ status: 'pending', courtId: null, calledAt: null, startedAt: null, sets: [] }).where(eq(matches.id, matchId)).returning()
  return u!
}

export async function startMatch(ctx: Ctx, matchId: string): Promise<Match> {
  const { m } = await load(ctx, matchId)
  if (m.status === 'playing') return m
  if (m.status !== 'called') throw conflict('Le match doit d\'abord être appelé sur un terrain.')
  const [u] = await ctx.db.update(matches).set({ status: 'playing', startedAt: ctx.now() }).where(eq(matches.id, matchId)).returning()
  return u!
}

/** Score en direct, point par point : le match se termine tout seul quand le score est acquis. */
export async function liveScore(ctx: Ctx, matchId: string, sets: SetScore[]): Promise<Match> {
  const { m, cat } = await load(ctx, matchId)
  if (m.status === 'completed' || m.status === 'cancelled') throw conflict('Ce match est terminé. Corrigez son résultat depuis la feuille de match.')
  if (!m.entry1Id || !m.entry2Id) throw bad('Les deux adversaires ne sont pas encore connus.')
  const rules = rulesFor(cat, m)
  const o = analyzeScore(sets, rules)
  if (!o.valid) throw bad(o.error ?? 'Score invalide.')
  if (o.finished) return recordResult(ctx, matchId, { sets, resultType: 'normal' })
  const [u] = await ctx.db.update(matches).set({ sets, status: 'playing', startedAt: m.startedAt ?? ctx.now() }).where(eq(matches.id, matchId)).returning()
  return u!
}

export interface ResultInput {
  sets: SetScore[]
  resultType: 'normal' | 'retired' | 'walkover'
  /** Obligatoire pour un abandon ou un forfait. */
  winner?: 1 | 2
}

/** Enregistre ou corrige un résultat, puis fait avancer le tableau. */
export async function recordResult(ctx: Ctx, matchId: string, input: ResultInput): Promise<Match> {
  const { m, cat } = await load(ctx, matchId)
  if (m.resultType === 'bye') throw conflict('Ce match est une exemption.')
  if (m.status === 'cancelled') throw conflict('Ce match a été annulé.')
  if (!m.entry1Id || !m.entry2Id) throw bad('Les deux adversaires ne sont pas encore connus.')
  // une correction garde les règles sous lesquelles le match a été joué
  const rules = m.status === 'completed' && m.rules ? m.rules : rulesFor(cat, { phase: m.phase, rules: null })
  let winner: 1 | 2
  let sets = input.sets
  if (input.resultType === 'normal') {
    const o = analyzeScore(sets, rules)
    if (!o.valid) throw bad(o.error ?? 'Score invalide.')
    if (!o.finished || !o.winner) throw bad('Le score saisi ne désigne pas encore de vainqueur.')
    winner = o.winner
  } else {
    if (input.winner !== 1 && input.winner !== 2) throw bad('Indiquez le vainqueur.')
    winner = input.winner
    if (input.resultType === 'walkover') sets = []
    else {
      const o = analyzeScore(sets, rules)
      if (!o.valid) throw bad(o.error ?? 'Score invalide.')
      if (o.finished) throw bad('Ce score est complet : enregistrez un résultat normal.')
    }
  }
  if (m.status === 'completed' && m.winnerSide !== winner) await assertDownstreamFree(ctx, m)
  const now = ctx.now()
  const [u] = await ctx.db.update(matches).set({
    status: 'completed', sets, winnerSide: winner, resultType: input.resultType, rules,
    startedAt: m.startedAt ?? (input.resultType === 'walkover' ? null : now), endedAt: m.endedAt ?? now
  }).where(eq(matches.id, matchId)).returning()
  await settleCategory(ctx.db, m.categoryId)
  return u!
}

async function assertDownstreamFree(ctx: Ctx, m: Match): Promise<void> {
  const targets = [m.nextMatchId, m.loserNextMatchId].filter((x): x is string => !!x)
  if (targets.length === 0) return
  const next = await ctx.db.select().from(matches).where(inArray(matches.id, targets))
  if (next.some(n => n.status !== 'pending' && n.resultType !== 'bye')) {
    throw conflict('Le match suivant du tableau est déjà lancé : annulez-le d\'abord pour pouvoir changer le vainqueur.')
  }
}

/** Efface un résultat : le match redevient à jouer. */
export async function resetMatch(ctx: Ctx, matchId: string): Promise<Match> {
  const { m } = await load(ctx, matchId)
  if (m.resultType === 'bye') throw conflict('Ce match est une exemption.')
  if (m.status === 'completed') await assertDownstreamFree(ctx, m)
  const [u] = await ctx.db.update(matches).set({
    status: 'pending', sets: [], winnerSide: null, resultType: null, rules: null, courtId: null, calledAt: null, startedAt: null, endedAt: null
  }).where(eq(matches.id, matchId)).returning()
  // le vainqueur n'est plus connu : on libère la place en aval
  for (const [t, side] of [[m.nextMatchId, m.nextSide], [m.loserNextMatchId, m.loserNextSide]] as const) {
    if (t && side) await ctx.db.update(matches).set(side === 1 ? { entry1Id: null } : { entry2Id: null }).where(eq(matches.id, t))
  }
  await settleCategory(ctx.db, m.categoryId)
  return u!
}
