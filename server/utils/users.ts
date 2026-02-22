import { db } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import type { User } from '../db/schema/users'
import { users } from '../db/schema/users'

export async function getUsers() {
  return db.select().from(users)
}

export async function getUserByEmail(email: string) {
  const normalized = email.trim().toLowerCase()
  const rows = await db.select().from(users).where(eq(users.email, normalized))
  return rows[0] ?? undefined
}

export async function createUser(email: string, name: string, passwordHash: string) {
  const normalized = email.trim().toLowerCase()
  const existing = await getUserByEmail(normalized)
  if (existing) {
    throw new Error('USER_EXISTS')
  }
  const id = crypto.randomUUID()
  const [inserted] = await db.insert(users).values({
    id,
    email: normalized,
    name,
    passwordHash
  }).returning()
  if (!inserted) {
    throw new Error('Insert failed')
  }
  return inserted
}

export async function getUserById(id: string) {
  const rows = await db.select().from(users).where(eq(users.id, id))
  return rows[0] ?? undefined
}

export async function updateUser(id: string, data: Partial<User>) {
  const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning()
  return updated ?? undefined
}

export async function deleteUser(id: string) {
  const result = await db.delete(users).where(eq(users.id, id)).returning()
  return result[0] ?? undefined
}
