import { integer, pgTable, text } from "drizzle-orm/pg-core";
import { matches } from "./matchs";

export const sets = pgTable('sets', {
  id: text('id').primaryKey(),
  matchId: text('match_id').notNull().references(() => matches.id),
  setNumber: integer('set_number').notNull(),
  score1: integer('score1').notNull().default(0),
  score2: integer('score2').notNull().default(0),
});

// Inferred types (optional, for use in server code)
export type Set = typeof sets.$inferSelect
export type NewSet = typeof sets.$inferInsert
