import { db } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import type { Set } from '../db/schema/sets'
import { sets } from '../db/schema/sets'

export async function getSetsByMatchId(matchId: string) {
  return db.select().from(sets).where(eq(sets.matchId, matchId))
}

export async function createSet(data: {
  matchId: string
  setNumber: number
  score1?: number
  score2?: number
}) {
  const id = crypto.randomUUID()
  const [inserted] = await db.insert(sets).values({ ...data, id }).returning()
  return inserted ?? undefined
}

export async function updateSet(id: string, data: Partial<Set>) {
  const [updated] = await db.update(sets).set(data).where(eq(sets.id, id)).returning()
  return updated ?? undefined
}

export async function deleteSet(id: string) {
  const result = await db.delete(sets).where(eq(sets.id, id)).returning()
  return result[0] ?? undefined
}
