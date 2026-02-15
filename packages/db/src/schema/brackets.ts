import {
  integer,
  pgTable,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { categories } from "./categories";

export const brackets = pgTable("brackets", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 20 }).notNull().default("main"),
  roundCount: integer("round_count").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
});
