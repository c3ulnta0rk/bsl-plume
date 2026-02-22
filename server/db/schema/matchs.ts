import { integer, pgTable, text, timestamp, type AnyPgColumn } from 'drizzle-orm/pg-core'
import { phases } from './rounds'
import { teams } from './teams'
import { pools } from './pools'

export const matches = pgTable('matches', {
  id: text('id').primaryKey(),
  phaseId: text('phase_id').notNull().references(() => phases.id),
  poolId: text('pool_id').references(() => pools.id), // null si knockout
  team1Id: text('team1_id').references(() => teams.id),
  team2Id: text('team2_id').references(() => teams.id),
  winnerId: text('winner_id').references(() => teams.id),
  // Pour le bracket knockout
  round: integer('round'),
  bracketPosition: integer('bracket_position'),
  nextMatchId: text('next_match_id').references((): AnyPgColumn => matches.id),
  nextMatchSlot: integer('next_match_slot'),
  status: text('status').notNull().default('pending'),
  court: text('court'),
  scheduledAt: timestamp('scheduled_at')
})

// Inferred types (optional, for use in server code)
export type Match = typeof matches.$inferSelect
export type NewMatch = typeof matches.$inferInsert
