import { integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { categories } from './categories'

export const phases = pgTable('phases', {
  id: text('id').primaryKey(),
  categoryId: text('category_id').notNull().references(() => categories.id),
  name: text('name').notNull(), // "Poules", "Élimination"
  type: text('type').notNull(), // "pool" | "knockout"
  phaseOrder: integer('phase_order').notNull(), // 1, 2, 3...
  config: jsonb('config').notNull(), // toute la config flexible
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow()
})

// Inferred types (optional, for use in server code)
export type Phase = typeof phases.$inferSelect
export type NewPhase = typeof phases.$inferInsert
