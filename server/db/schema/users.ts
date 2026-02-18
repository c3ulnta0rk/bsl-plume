import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { clubs } from './clubs';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  clubId: text('club_id').references(() => clubs.id),
  licenseNumber: text('license_number'), // numéro de licence
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Inferred types (optional, for use in server code)
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
