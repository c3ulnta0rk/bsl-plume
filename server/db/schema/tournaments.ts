import { pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { clubs } from "./clubs";

export const tournaments = pgTable('tournaments', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  clubId: text('club_id').notNull().references(() => clubs.id), // ← ajouter la FK !
  date: timestamp('date'),
  location: text('location'),
  status: text('status').notNull().default('draft'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Inferred types (optional, for use in server code)
export type Tournament = typeof tournaments.$inferSelect
export type NewTournament = typeof tournaments.$inferInsert
