import { db } from '@nuxthub/db'
import { eq, desc, sql, count } from 'drizzle-orm'
import type { Match } from '../db/schema/matchs'
import { matches } from '../db/schema/matchs'
import { teams } from '../db/schema/teams'

export async function getMatches(options: { limit?: number; offset?: number; status?: string; search?: string } = {}) {
  const { limit = 50, offset = 0, status, search } = options

  const conditions = []
  if (status) conditions.push(eq(matches.status, status))
  if (search) {
    conditions.push(sql`(t1.name ILIKE ${'%' + search + '%'} OR t2.name ILIKE ${'%' + search + '%'})`)
  }

  const where = conditions.length > 0
    ? sql.join(conditions, sql` AND `)
    : undefined

  let query = db.select({
    id: matches.id,
    status: matches.status,
    court: matches.court,
    round: matches.round,
    team1Id: matches.team1Id,
    team2Id: matches.team2Id,
    winnerId: matches.winnerId,
    poolId: matches.poolId,
    phaseId: matches.phaseId,
    team1Name: sql<string | null>`t1.name`,
    team2Name: sql<string | null>`t2.name`
  })
    .from(matches)
    .leftJoin(sql`${teams} as t1`, sql`t1.id = ${matches.team1Id}`)
    .leftJoin(sql`${teams} as t2`, sql`t2.id = ${matches.team2Id}`)
    .$dynamic()

  if (where) query = query.where(where)

  const rows = await query
    .orderBy(desc(matches.status))
    .limit(limit)
    .offset(offset)

  let countQuery = db.select({ total: count() })
    .from(matches)
    .leftJoin(sql`${teams} as t1`, sql`t1.id = ${matches.team1Id}`)
    .leftJoin(sql`${teams} as t2`, sql`t2.id = ${matches.team2Id}`)
    .$dynamic()

  if (where) countQuery = countQuery.where(where)

  const result = await countQuery
  const total = result[0]?.total ?? 0

  return { rows, total }
}

export async function getMatchById(id: string) {
  const rows = await db.select().from(matches).where(eq(matches.id, id))
  return rows[0] ?? undefined
}

export async function getMatchesByPhaseId(phaseId: string) {
  return db.select().from(matches).where(eq(matches.phaseId, phaseId))
}

export async function getMatchesByPoolId(poolId: string) {
  return db.select().from(matches).where(eq(matches.poolId, poolId))
}

export async function createMatch(data: {
  phaseId: string
  poolId?: string | null
  team1Id?: string | null
  team2Id?: string | null
  winnerId?: string | null
  round?: number | null
  bracketPosition?: number | null
  nextMatchId?: string | null
  nextMatchSlot?: number | null
  status?: string
  court?: string | null
  scheduledAt?: Date | null
}) {
  const id = crypto.randomUUID()
  const [inserted] = await db.insert(matches).values({ ...data, id }).returning()
  return inserted ?? undefined
}

export async function updateMatch(id: string, data: Partial<Match>) {
  const [updated] = await db.update(matches).set(data).where(eq(matches.id, id)).returning()
  return updated ?? undefined
}

export async function deleteMatch(id: string) {
  const result = await db.delete(matches).where(eq(matches.id, id)).returning()
  return result[0] ?? undefined
}
