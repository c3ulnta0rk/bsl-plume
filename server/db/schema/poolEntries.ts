import { integer, pgTable, text } from "drizzle-orm/pg-core";
import { pools } from "./pools";
import { teams } from "./teams";

export const poolEntries = pgTable('pool_entries', {
  id: text('id').primaryKey(),
  poolId: text('pool_id').notNull().references(() => pools.id),
  teamId: text('team_id').notNull().references(() => teams.id),
  finalRank: integer('final_rank'),
});

// Inferred types (optional, for use in server code)
export type PoolEntry = typeof poolEntries.$inferSelect
export type NewPoolEntry = typeof poolEntries.$inferInsert
