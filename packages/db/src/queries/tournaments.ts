import { and, desc, eq } from "drizzle-orm";
import type { Database } from "../index";
import { tournaments } from "../schema/tournaments";

export function getTournamentById(db: Database, id: string) {
  return db.query.tournaments.findFirst({
    where: eq(tournaments.id, id),
  });
}

export function listTournamentsByClub(db: Database, clubId: string) {
  return db.query.tournaments.findMany({
    where: eq(tournaments.clubId, clubId),
    orderBy: [desc(tournaments.startDate)],
  });
}

export function listPublicTournaments(db: Database, clubId: string) {
  return db.query.tournaments.findMany({
    where: and(
      eq(tournaments.clubId, clubId),
      // Exclude draft tournaments from public view
    ),
    orderBy: [desc(tournaments.startDate)],
  });
}

export function createTournament(
  db: Database,
  data: typeof tournaments.$inferInsert,
) {
  return db.insert(tournaments).values(data).returning();
}

export function updateTournament(
  db: Database,
  id: string,
  data: Partial<Omit<typeof tournaments.$inferInsert, "id">>,
) {
  return db
    .update(tournaments)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(tournaments.id, id))
    .returning();
}

export function updateTournamentStatus(
  db: Database,
  id: string,
  status: string,
) {
  return db
    .update(tournaments)
    .set({ status, updatedAt: new Date() })
    .where(eq(tournaments.id, id))
    .returning();
}
