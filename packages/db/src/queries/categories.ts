import { eq } from "drizzle-orm";
import type { Database } from "../index";
import { categories } from "../schema/categories";

export function getCategoryById(db: Database, id: string) {
  return db.query.categories.findFirst({
    where: eq(categories.id, id),
  });
}

export function listCategoriesByTournament(
  db: Database,
  tournamentId: string,
) {
  return db.query.categories.findMany({
    where: eq(categories.tournamentId, tournamentId),
    orderBy: (categories, { asc }) => [asc(categories.type)],
  });
}

export function createCategory(
  db: Database,
  data: typeof categories.$inferInsert,
) {
  return db.insert(categories).values(data).returning();
}

export function createCategories(
  db: Database,
  data: Array<typeof categories.$inferInsert>,
) {
  return db.insert(categories).values(data).returning();
}

export function updateCategory(
  db: Database,
  id: string,
  data: Partial<Omit<typeof categories.$inferInsert, "id">>,
) {
  return db
    .update(categories)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(categories.id, id))
    .returning();
}
