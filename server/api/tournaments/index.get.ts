import { db } from '@nuxthub/db'
import { eq, inArray } from 'drizzle-orm'
import { tournaments } from '../../db/schema/tournaments'
import { clubs } from '../../db/schema/clubs'

export default defineEventHandler(async () => {
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
    .where(inArray(tournaments.status, ['published', 'archived']))

  return rows
})
