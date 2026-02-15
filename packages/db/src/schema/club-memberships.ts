import {
  index,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { clubs } from "./clubs";

export const clubMemberships = pgTable(
  "club_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    clubId: uuid("club_id")
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 20 }).notNull().default("player"),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => [
    unique("club_memberships_user_club_unique").on(
      table.userId,
      table.clubId,
    ),
    index("club_memberships_user_id_idx").on(table.userId),
    index("club_memberships_club_id_idx").on(table.clubId),
  ],
);
