import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { users } from './users'
import { tournaments } from './tournaments'
import { categories } from './categories'

export const teams = pgTable('teams', {
  id: text('id').primaryKey(),
  // ❌ name unique → une paire "Martin/Dupont" peut exister dans plusieurs tournois
  name: text('name').notNull(), // retirer .unique()
  playerOneId: text('player_one_id').notNull().references(() => users.id), // ← notNull !
  playerTwoId: text('player_two_id').references(() => users.id), // null en simple
  tournamentId: text('tournament_id').notNull().references(() => tournaments.id),
  categoryId: text('category_id').notNull().references(() => categories.id),
  seed: integer('seed'), // tête de série pour le tirage
  createdAt: timestamp('created_at').notNull().defaultNow()
})

// Inferred types (optional, for use in server code)
export type Team = typeof teams.$inferSelect
export type NewTeam = typeof teams.$inferInsert
