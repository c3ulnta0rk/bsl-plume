import { pgTable, text } from 'drizzle-orm/pg-core'
import { phases } from './rounds'

export const pools = pgTable('pools', {
  id: text('id').primaryKey(),
  phaseId: text('phase_id').notNull().references(() => phases.id),
  name: text('name').notNull() // "A", "B", "C"
})

// Inferred types (optional, for use in server code)
export type Pool = typeof pools.$inferSelect
export type NewPool = typeof pools.$inferInsert
