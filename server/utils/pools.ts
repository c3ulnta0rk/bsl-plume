import { db } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import type { PoolEntry } from '../db/schema/poolEntries'
import { pools } from '../db/schema/pools'
import { poolEntries } from '../db/schema/poolEntries'

// --- Pool CRUD ---

export async function getPoolById(id: string) {
  const rows = await db.select().from(pools).where(eq(pools.id, id))
  return rows[0] ?? undefined
}

export async function getPoolsByPhaseId(phaseId: string) {
  return db.select().from(pools).where(eq(pools.phaseId, phaseId))
}

export async function createPool(data: { phaseId: string; name: string }) {
  const id = crypto.randomUUID()
  const [inserted] = await db.insert(pools).values({ ...data, id }).returning()
  return inserted ?? undefined
}

export async function deletePool(id: string) {
  const result = await db.delete(pools).where(eq(pools.id, id)).returning()
  return result[0] ?? undefined
}

// --- PoolEntry CRUD ---

export async function getPoolEntriesByPoolId(poolId: string) {
  return db.select().from(poolEntries).where(eq(poolEntries.poolId, poolId))
}

export async function createPoolEntry(data: { poolId: string; teamId: string; finalRank?: number | null }) {
  const id = crypto.randomUUID()
  const [inserted] = await db.insert(poolEntries).values({ ...data, id }).returning()
  return inserted ?? undefined
}

export async function updatePoolEntry(id: string, data: Partial<PoolEntry>) {
  const [updated] = await db.update(poolEntries).set(data).where(eq(poolEntries.id, id)).returning()
  return updated ?? undefined
}

export async function deletePoolEntry(id: string) {
  const result = await db.delete(poolEntries).where(eq(poolEntries.id, id)).returning()
  return result[0] ?? undefined
}
