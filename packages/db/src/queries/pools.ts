import { eq } from "drizzle-orm";
import type { Database } from "../index";
import { poolEntries, pools } from "../schema/pools";

export function getPoolById(db: Database, id: string) {
  return db.query.pools.findFirst({
    where: eq(pools.id, id),
  });
}

export function listPoolsByCategory(db: Database, categoryId: string) {
  return db.query.pools.findMany({
    where: eq(pools.categoryId, categoryId),
    orderBy: (p, { asc }) => [asc(p.name)],
  });
}

export function createPool(
  db: Database,
  data: typeof pools.$inferInsert,
) {
  return db.insert(pools).values(data).returning();
}

export function createPools(
  db: Database,
  data: Array<typeof pools.$inferInsert>,
) {
  return db.insert(pools).values(data).returning();
}

export function createPoolEntries(
  db: Database,
  data: Array<typeof poolEntries.$inferInsert>,
) {
  return db.insert(poolEntries).values(data).returning();
}

export function listPoolEntries(db: Database, poolId: string) {
  return db.query.poolEntries.findMany({
    where: eq(poolEntries.poolId, poolId),
    orderBy: (pe, { asc }) => [asc(pe.rank)],
  });
}

export function updatePoolEntry(
  db: Database,
  id: string,
  data: Partial<Omit<typeof poolEntries.$inferInsert, "id">>,
) {
  return db
    .update(poolEntries)
    .set(data)
    .where(eq(poolEntries.id, id))
    .returning();
}

export function updatePoolStatus(
  db: Database,
  id: string,
  status: string,
) {
  return db
    .update(pools)
    .set({ status })
    .where(eq(pools.id, id))
    .returning();
}
