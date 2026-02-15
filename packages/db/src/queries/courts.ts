import { and, eq } from "drizzle-orm";
import type { Database } from "../index";
import { courts } from "../schema/courts";

export function getCourtById(db: Database, id: string) {
  return db.query.courts.findFirst({
    where: eq(courts.id, id),
  });
}

export function listCourtsByTournament(
  db: Database,
  tournamentId: string,
) {
  return db.query.courts.findMany({
    where: eq(courts.tournamentId, tournamentId),
    orderBy: (c, { asc }) => [asc(c.number)],
  });
}

export function getAvailableCourts(
  db: Database,
  tournamentId: string,
) {
  return db.query.courts.findMany({
    where: and(
      eq(courts.tournamentId, tournamentId),
      eq(courts.status, "available"),
    ),
    orderBy: (c, { asc }) => [asc(c.number)],
  });
}

export function createCourt(
  db: Database,
  data: typeof courts.$inferInsert,
) {
  return db.insert(courts).values(data).returning();
}

export function createCourts(
  db: Database,
  data: Array<typeof courts.$inferInsert>,
) {
  return db.insert(courts).values(data).returning();
}

export function assignCourtToMatch(
  db: Database,
  courtId: string,
  matchId: string,
) {
  return db
    .update(courts)
    .set({ currentMatchId: matchId, status: "in_use" })
    .where(eq(courts.id, courtId))
    .returning();
}

export function releaseCourt(db: Database, courtId: string) {
  return db
    .update(courts)
    .set({ currentMatchId: null, status: "available" })
    .where(eq(courts.id, courtId))
    .returning();
}
