import {
  boolean,
  index,
  integer,
  pgTable,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { categories } from "./categories";
import { players } from "./players";

export const pools = pgTable(
  "pools",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 10 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    size: integer("size").notNull(),
  },
  (table) => [index("pools_category_id_idx").on(table.categoryId)],
);

export const poolEntries = pgTable(
  "pool_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    poolId: uuid("pool_id")
      .notNull()
      .references(() => pools.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    wins: integer("wins").notNull().default(0),
    losses: integer("losses").notNull().default(0),
    pointsFor: integer("points_for").notNull().default(0),
    pointsAgainst: integer("points_against").notNull().default(0),
    rank: integer("rank"),
    isQualified: boolean("is_qualified").notNull().default(false),
  },
  (table) => [
    index("pool_entries_pool_id_idx").on(table.poolId),
    index("pool_entries_player_id_idx").on(table.playerId),
  ],
);
