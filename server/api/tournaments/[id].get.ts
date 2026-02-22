import { db } from '@nuxthub/db'
import { eq, and, inArray } from 'drizzle-orm'
import { tournaments } from '../../db/schema/tournaments'
import { clubs } from '../../db/schema/clubs'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!

  const rows = await db.select({
    id: tournaments.id,
    name: tournaments.name,
    date: tournaments.date,
    location: tournaments.location,
    status: tournaments.status,
    clubName: clubs.name
  })
    .from(tournaments)
    .leftJoin(clubs, eq(tournaments.clubId, clubs.id))
    .where(and(eq(tournaments.id, id), inArray(tournaments.status, ['published', 'archived'])))

  if (!rows[0]) {
    throw createError({ statusCode: 404, message: 'Tournament not found' })
  }

  return rows[0]
})
