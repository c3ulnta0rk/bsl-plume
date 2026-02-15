import {
  index,
  integer,
  pgTable,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { matches } from "./matches";
import { tournaments } from "./tournaments";

export const courts = pgTable(
  "courts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tournamentId: uuid("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    name: varchar("name", { length: 50 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("available"),
    currentMatchId: uuid("current_match_id").references(() => matches.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("courts_tournament_id_idx").on(table.tournamentId),
  ],
);
