import { db } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import type { Club } from '../db/schema/clubs'
import { clubs } from '../db/schema/clubs'

export async function getClubs() {
  return db.select().from(clubs)
}

export async function getClubById(id: string) {
  const rows = await db.select().from(clubs).where(eq(clubs.id, id))
  return rows[0] ?? undefined
}

export async function createClub(data: { name: string }) {
  const id = crypto.randomUUID()
  const [inserted] = await db.insert(clubs).values({ ...data, id }).returning()
  return inserted ?? undefined
}

export async function updateClub(id: string, data: Partial<Club>) {
  const [updated] = await db.update(clubs).set(data).where(eq(clubs.id, id)).returning()
  return updated ?? undefined
}

export async function deleteClub(id: string) {
  const result = await db.delete(clubs).where(eq(clubs.id, id)).returning()
  return result[0] ?? undefined
}
