import { eq } from "drizzle-orm";
import type { Database } from "../index";
import { brackets } from "../schema/brackets";

export function getBracketById(db: Database, id: string) {
  return db.query.brackets.findFirst({
    where: eq(brackets.id, id),
  });
}

export function getBracketByCategory(
  db: Database,
  categoryId: string,
) {
  return db.query.brackets.findFirst({
    where: eq(brackets.categoryId, categoryId),
  });
}

export function createBracket(
  db: Database,
  data: typeof brackets.$inferInsert,
) {
  return db.insert(brackets).values(data).returning();
}

export function updateBracketStatus(
  db: Database,
  id: string,
  status: string,
) {
  return db
    .update(brackets)
    .set({ status })
    .where(eq(brackets.id, id))
    .returning();
}
