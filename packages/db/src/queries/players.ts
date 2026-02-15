import { eq } from "drizzle-orm";
import type { Database } from "../index";
import { players } from "../schema/players";

export function getPlayerById(db: Database, id: string) {
  return db.query.players.findFirst({
    where: eq(players.id, id),
  });
}

export function getPlayerByUserId(db: Database, userId: string) {
  return db.query.players.findFirst({
    where: eq(players.userId, userId),
  });
}

export function createPlayer(
  db: Database,
  data: typeof players.$inferInsert,
) {
  return db.insert(players).values(data).returning();
}

export function updatePlayer(
  db: Database,
  id: string,
  data: Partial<Omit<typeof players.$inferInsert, "id">>,
) {
  return db
    .update(players)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(players.id, id))
    .returning();
}

export function upsertPlayer(
  db: Database,
  data: typeof players.$inferInsert,
) {
  return db
    .insert(players)
    .values(data)
    .onConflictDoUpdate({
      target: players.userId,
      set: {
        firstName: data.firstName,
        lastName: data.lastName,
        birthDate: data.birthDate,
        club: data.club,
        licenseNumber: data.licenseNumber,
        updatedAt: new Date(),
      },
    })
    .returning();
}
