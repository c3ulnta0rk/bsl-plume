import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const clubs = pgTable('clubs', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow()
})

// Inferred types (optional, for use in server code)
export type Club = typeof clubs.$inferSelect
export type NewClub = typeof clubs.$inferInsert
