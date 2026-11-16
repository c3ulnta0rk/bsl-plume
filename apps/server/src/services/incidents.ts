import { and, eq, inArray, or } from 'drizzle-orm'
import { bad, notFound, type Ctx } from '../context'
import { schema } from '../db'
import { rulesFor, settleCategory } from './draw'

const { categories, matches, registrations } = schema

/**
 * Retrait d'un joueur ou d'une paire en cours de tournoi (blessure, départ…).
 * - `annul` : ses résultats de poule sont annulés, comme s'il n'avait pas joué.
 * - `walkover` : ses résultats sont conservés, ses matchs restants sont perdus par forfait.
 * En tableau final, l'adversaire passe toujours par forfait.
 */
export async function withdrawEntry(ctx: Ctx, registrationId: string, mode: 'annul' | 'walkover'): Promise<{ tournamentId: string, categoryId: string }> {
  const [reg] = await ctx.db.select().from(registrations).where(eq(registrations.id, registrationId))
  if (!reg) throw notFound('Inscription introuvable.')
  if (reg.status !== 'accepted') throw bad('Seule une inscription validée peut être retirée du tableau.')
  const [cat] = await ctx.db.select().from(categories).where(eq(categories.id, reg.categoryId))
  await ctx.db.update(registrations).set({ status: 'withdrawn', withdrawMode: mode }).where(eq(registrations.id, registrationId))
  const mine = await ctx.db.select().from(matches).where(and(eq(matches.categoryId, reg.categoryId), or(eq(matches.entry1Id, registrationId), eq(matches.entry2Id, registrationId))))
  const now = ctx.now()
  for (const m of mine) {
    if (m.phase !== 'pool') continue
    if (mode === 'annul') {
      await ctx.db.update(matches).set({ status: 'cancelled', courtId: null }).where(eq(matches.id, m.id))
    } else if (m.status !== 'completed' && m.status !== 'cancelled') {
      const partial = m.sets.length > 0
      await ctx.db.update(matches).set({
        status: 'completed', resultType: partial ? 'retired' : 'walkover', winnerSide: m.entry1Id === registrationId ? 2 : 1,
        endedAt: now, rules: rulesFor(cat!, m), courtId: m.courtId
      }).where(eq(matches.id, m.id))
    }
  }
  // tableau : un match en cours devient un abandon, le reste est réglé par settleCategory
  for (const m of mine) {
    if (m.phase !== 'bracket' || (m.status !== 'called' && m.status !== 'playing')) continue
    await ctx.db.update(matches).set({
      status: 'completed', resultType: m.sets.length > 0 ? 'retired' : 'walkover', winnerSide: m.entry1Id === registrationId ? 2 : 1, endedAt: now, rules: rulesFor(cat!, m)
    }).where(eq(matches.id, m.id))
  }
  await settleCategory(ctx.db, reg.categoryId)
  return { tournamentId: reg.tournamentId, categoryId: reg.categoryId }
}

/** Annule un retrait tant que rien n'a été joué à sa place. */
export async function reinstateEntry(ctx: Ctx, registrationId: string): Promise<{ tournamentId: string }> {
  const [reg] = await ctx.db.select().from(registrations).where(eq(registrations.id, registrationId))
  if (!reg) throw notFound('Inscription introuvable.')
  if (reg.status !== 'withdrawn') throw bad('Cette inscription n\'est pas retirée.')
  await ctx.db.update(registrations).set({ status: 'accepted', withdrawMode: null }).where(eq(registrations.id, registrationId))
  const mine = await ctx.db.select().from(matches).where(and(eq(matches.categoryId, reg.categoryId), or(eq(matches.entry1Id, registrationId), eq(matches.entry2Id, registrationId))))
  const ids = mine.filter(m => m.status === 'cancelled' || (m.status === 'completed' && m.resultType === 'walkover')).map(m => m.id)
  if (ids.length > 0) {
    await ctx.db.update(matches).set({ status: 'pending', resultType: null, winnerSide: null, endedAt: null, rules: null, courtId: null, calledAt: null, startedAt: null, sets: [] }).where(inArray(matches.id, ids))
  }
  await settleCategory(ctx.db, reg.categoryId)
  return { tournamentId: reg.tournamentId }
}
