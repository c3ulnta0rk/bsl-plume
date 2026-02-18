import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { tournaments } from "./tournaments";

// Catégories "types" réutilisables (SH, DD, DM, etc.)
export const categoryTypes = pgTable('category_types', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(), // "Simple Homme", "Double Dame"
  type: text('type').notNull(), // "singles" | "doubles" | "mixed"
  gender: text('gender'), // "M" | "F" | "mixed"
});

// Catégorie d'un tournoi spécifique, avec sa config
export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  tournamentId: text('tournament_id').notNull().references(() => tournaments.id),
  categoryTypeId: text('category_type_id').notNull().references(() => categoryTypes.id),
  maxTeams: integer('max_teams'),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Inferred types (optional, for use in server code)
export type Category = typeof categories.$inferSelect
export type NewCategory = typeof categories.$inferInsert
