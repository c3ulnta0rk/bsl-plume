import { db } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { users } from '../db/schema'

export async function getUserByEmail(email: string) {
  const normalized = email.trim().toLowerCase()
  const rows = await db.select().from(users).where(eq(users.email, normalized))
  return rows[0] ?? undefined
}

export async function createUser(email: string, passwordHash: string) {
  const normalized = email.trim().toLowerCase()
  const existing = await getUserByEmail(normalized)
  if (existing) {
    throw new Error('USER_EXISTS')
  }
  const id = crypto.randomUUID()
  const [inserted] = await db.insert(users).values({
    id,
    email: normalized,
    passwordHash
  }).returning()
  if (!inserted) {
    throw new Error('Insert failed')
  }
  return inserted
}
