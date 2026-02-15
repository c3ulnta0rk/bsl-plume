import { and, eq, sql } from "drizzle-orm";
import type { Database } from "../index";
import { registrations } from "../schema/registrations";

export function getRegistrationById(db: Database, id: string) {
  return db.query.registrations.findFirst({
    where: eq(registrations.id, id),
  });
}

export function listRegistrationsByCategory(
  db: Database,
  categoryId: string,
) {
  return db.query.registrations.findMany({
    where: eq(registrations.categoryId, categoryId),
    orderBy: (r, { asc }) => [asc(r.registeredAt)],
  });
}

export function listRegistrationsByPlayer(
  db: Database,
  playerId: string,
) {
  return db.query.registrations.findMany({
    where: eq(registrations.playerId, playerId),
  });
}

export function getRegistration(
  db: Database,
  playerId: string,
  categoryId: string,
) {
  return db.query.registrations.findFirst({
    where: and(
      eq(registrations.playerId, playerId),
      eq(registrations.categoryId, categoryId),
    ),
  });
}

export function createRegistration(
  db: Database,
  data: typeof registrations.$inferInsert,
) {
  return db.insert(registrations).values(data).returning();
}

export function updateRegistrationStatus(
  db: Database,
  id: string,
  status: string,
) {
  return db
    .update(registrations)
    .set({ status })
    .where(eq(registrations.id, id))
    .returning();
}

export function countRegistrationsByCategory(
  db: Database,
  categoryId: string,
) {
  return db
    .select({ count: sql<number>`count(*)::int` })
    .from(registrations)
    .where(
      and(
        eq(registrations.categoryId, categoryId),
        eq(registrations.status, "confirmed"),
      ),
    );
}

export function deleteRegistration(db: Database, id: string) {
  return db
    .delete(registrations)
    .where(eq(registrations.id, id))
    .returning();
}
