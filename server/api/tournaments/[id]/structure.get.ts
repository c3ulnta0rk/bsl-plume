import { db } from '@nuxthub/db'
import { eq, and, inArray } from 'drizzle-orm'
import { tournaments } from '../../../db/schema/tournaments'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!

  const rows = await db.select({ id: tournaments.id })
    .from(tournaments)
    .where(and(eq(tournaments.id, id), inArray(tournaments.status, ['published', 'archived'])))

  if (!rows[0]) {
    throw createError({ statusCode: 404, message: 'Tournament not found' })
  }

  return await getTournamentStructure(id)
})
