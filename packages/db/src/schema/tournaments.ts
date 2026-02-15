import {
  index,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { clubs } from "./clubs";

export const tournaments = pgTable(
  "tournaments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clubId: uuid("club_id")
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: varchar("description", { length: 2000 }),
    location: varchar("location", { length: 255 }),
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date").notNull(),
    registrationStart: timestamp("registration_start").notNull(),
    registrationEnd: timestamp("registration_end").notNull(),
    status: varchar("status", { length: 50 }).notNull().default("draft"),
    settings: jsonb("settings"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("tournaments_club_id_idx").on(table.clubId),
    index("tournaments_status_idx").on(table.status),
  ],
);
