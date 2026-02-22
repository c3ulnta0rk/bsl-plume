import { db } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import type { Phase } from '../db/schema/rounds'
import { phases } from '../db/schema/rounds'

export async function getPhaseById(id: string) {
  const rows = await db.select().from(phases).where(eq(phases.id, id))
  return rows[0] ?? undefined
}

export async function getPhasesByCategoryId(categoryId: string) {
  return db.select().from(phases).where(eq(phases.categoryId, categoryId))
}

export async function createPhase(data: {
  categoryId: string
  name: string
  type: string
  phaseOrder: number
  config: unknown
  status?: string
}) {
  const id = crypto.randomUUID()
  const [inserted] = await db.insert(phases).values({ ...data, id }).returning()
  return inserted ?? undefined
}

export async function updatePhase(id: string, data: Partial<Phase>) {
  const [updated] = await db.update(phases).set(data).where(eq(phases.id, id)).returning()
  return updated ?? undefined
}

export async function deletePhase(id: string) {
  const result = await db.delete(phases).where(eq(phases.id, id)).returning()
  return result[0] ?? undefined
}
