import {
  index,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { brackets } from "./brackets";
import { pools } from "./pools";

export const matches = pgTable(
  "matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    poolId: uuid("pool_id").references(() => pools.id, {
      onDelete: "cascade",
    }),
    bracketId: uuid("bracket_id").references(() => brackets.id, {
      onDelete: "cascade",
    }),
    round: integer("round").notNull(),
    position: integer("position").notNull(),
    participant1Id: uuid("participant1_id"),
    participant2Id: uuid("participant2_id"),
    scoreSet1P1: integer("score_set1_p1"),
    scoreSet1P2: integer("score_set1_p2"),
    scoreSet2P1: integer("score_set2_p1"),
    scoreSet2P2: integer("score_set2_p2"),
    scoreSet3P1: integer("score_set3_p1"),
    scoreSet3P2: integer("score_set3_p2"),
    status: varchar("status", { length: 20 })
      .notNull()
      .default("scheduled"),
    winnerId: uuid("winner_id"),
    courtNumber: integer("court_number"),
    scheduledTime: timestamp("scheduled_time"),
    startedAt: timestamp("started_at"),
    endedAt: timestamp("ended_at"),
    nextMatchId: uuid("next_match_id"),
  },
  (table) => [
    index("matches_pool_id_idx").on(table.poolId),
    index("matches_bracket_id_idx").on(table.bracketId),
    index("matches_status_idx").on(table.status),
  ],
);
