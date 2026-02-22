import { db } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import type { Tournament } from '../db/schema/tournaments'
import { tournaments } from '../db/schema/tournaments'

export async function getTournaments() {
  const rows = await db.select().from(tournaments)
  return rows
}

export async function getTournamentById(id: string) {
  const rows = await db.select().from(tournaments).where(eq(tournaments.id, id))
  return rows[0] ?? undefined
}

export async function createTournament(data: {
  name: string
  clubId: string
  date?: Date
  location?: string
  status?: 'draft' | 'published' | 'archived'
}) {
  const id = crypto.randomUUID()
  const [inserted] = await db.insert(tournaments).values({ ...data, id }).returning()
  return inserted ?? undefined
}

export async function updateTournament(id: string, data: Partial<Tournament>) {
  const [updated] = await db.update(tournaments).set(data).where(eq(tournaments.id, id)).returning()
  return updated ?? undefined
}

export async function deleteTournament(id: string) {
  const result = await db.delete(tournaments).where(eq(tournaments.id, id)).returning()
  return result[0] ?? undefined
}
