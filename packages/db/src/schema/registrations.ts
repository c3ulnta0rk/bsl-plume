import {
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { categories } from "./categories";
import { players } from "./players";

export const registrations = pgTable(
  "registrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    partnerId: uuid("partner_id").references(() => players.id, {
      onDelete: "set null",
    }),
    partnerEmail: varchar("partner_email", { length: 255 }),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    registeredAt: timestamp("registered_at").defaultNow().notNull(),
  },
  (table) => [
    index("registrations_player_id_idx").on(table.playerId),
    index("registrations_category_id_idx").on(table.categoryId),
  ],
);
