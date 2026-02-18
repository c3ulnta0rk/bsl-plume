import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow()
})

// Inferred types (optional, for use in server code)
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
