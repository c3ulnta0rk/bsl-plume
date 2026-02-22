import { db } from '@nuxthub/db'
import { eq, desc, count, sql } from 'drizzle-orm'
import type { Team } from '../db/schema/teams'
import { teams } from '../db/schema/teams'
import { tournaments } from '../db/schema/tournaments'
import { categories, categoryTypes } from '../db/schema/categories'

export async function getTeams(options: { limit?: number; offset?: number; search?: string } = {}) {
  const { limit = 50, offset = 0, search } = options

  const where = search
    ? sql`${teams.name} ILIKE ${'%' + search + '%'}`
    : undefined

  let query = db.select({
    id: teams.id,
    name: teams.name,
    seed: teams.seed,
    tournamentId: teams.tournamentId,
    categoryId: teams.categoryId,
    tournamentName: tournaments.name,
    categoryTypeName: categoryTypes.name
  })
    .from(teams)
    .leftJoin(tournaments, eq(teams.tournamentId, tournaments.id))
    .leftJoin(categories, eq(teams.categoryId, categories.id))
    .leftJoin(categoryTypes, eq(categories.categoryTypeId, categoryTypes.id))
    .$dynamic()

  if (where) query = query.where(where)

  const rows = await query
    .orderBy(desc(tournaments.date))
    .limit(limit)
    .offset(offset)

  let countQuery = db.select({ total: count() }).from(teams).$dynamic()
  if (where) countQuery = countQuery.where(where)

  const result = await countQuery
  const total = result[0]?.total ?? 0

  return { rows, total }
}

export async function getTeamById(id: string) {
  const rows = await db.select().from(teams).where(eq(teams.id, id))
  return rows[0] ?? undefined
}

export async function getTeamsByTournamentId(tournamentId: string) {
  return db.select().from(teams).where(eq(teams.tournamentId, tournamentId))
}

export async function getTeamsByCategoryId(categoryId: string) {
  return db.select().from(teams).where(eq(teams.categoryId, categoryId))
}

export async function createTeam(data: {
  name: string
  playerOneId: string
  playerTwoId?: string | null
  tournamentId: string
  categoryId: string
  seed?: number | null
}) {
  const id = crypto.randomUUID()
  const [inserted] = await db.insert(teams).values({ ...data, id }).returning()
  return inserted ?? undefined
}

export async function updateTeam(id: string, data: Partial<Team>) {
  const [updated] = await db.update(teams).set(data).where(eq(teams.id, id)).returning()
  return updated ?? undefined
}

export async function deleteTeam(id: string) {
  const result = await db.delete(teams).where(eq(teams.id, id)).returning()
  return result[0] ?? undefined
}
