import { and, eq, or } from "drizzle-orm";
import type { Database } from "../index";
import { matches } from "../schema/matches";

export function getMatchById(db: Database, id: string) {
  return db.query.matches.findFirst({
    where: eq(matches.id, id),
  });
}

export function listMatchesByPool(db: Database, poolId: string) {
  return db.query.matches.findMany({
    where: eq(matches.poolId, poolId),
    orderBy: (m, { asc }) => [asc(m.round), asc(m.position)],
  });
}

export function listMatchesByBracket(db: Database, bracketId: string) {
  return db.query.matches.findMany({
    where: eq(matches.bracketId, bracketId),
    orderBy: (m, { asc }) => [asc(m.round), asc(m.position)],
  });
}

export function listMatchesByPlayer(db: Database, playerId: string) {
  return db.query.matches.findMany({
    where: or(
      eq(matches.participant1Id, playerId),
      eq(matches.participant2Id, playerId),
    ),
    orderBy: (m, { desc }) => [desc(m.scheduledTime)],
  });
}

export function listScheduledMatches(db: Database) {
  return db.query.matches.findMany({
    where: eq(matches.status, "scheduled"),
    orderBy: (m, { asc }) => [asc(m.scheduledTime)],
  });
}

export function createMatch(
  db: Database,
  data: typeof matches.$inferInsert,
) {
  return db.insert(matches).values(data).returning();
}

export function createMatches(
  db: Database,
  data: Array<typeof matches.$inferInsert>,
) {
  return db.insert(matches).values(data).returning();
}

export function updateMatchScore(
  db: Database,
  id: string,
  data: {
    scoreSet1P1: number | null;
    scoreSet1P2: number | null;
    scoreSet2P1: number | null;
    scoreSet2P2: number | null;
    scoreSet3P1: number | null;
    scoreSet3P2: number | null;
    winnerId: string;
    status: string;
    endedAt: Date;
  },
) {
  return db
    .update(matches)
    .set(data)
    .where(eq(matches.id, id))
    .returning();
}

export function updateMatchStatus(
  db: Database,
  id: string,
  status: string,
  updates?: Partial<typeof matches.$inferInsert>,
) {
  return db
    .update(matches)
    .set({ status, ...updates })
    .where(eq(matches.id, id))
    .returning();
}

export function assignMatchCourt(
  db: Database,
  matchId: string,
  courtNumber: number,
) {
  return db
    .update(matches)
    .set({ courtNumber, status: "in_progress", startedAt: new Date() })
    .where(eq(matches.id, matchId))
    .returning();
}

export function listMatchesByStatus(
  db: Database,
  bracketId: string,
  status: string,
) {
  return db.query.matches.findMany({
    where: and(
      eq(matches.bracketId, bracketId),
      eq(matches.status, status),
    ),
    orderBy: (m, { asc }) => [asc(m.round), asc(m.position)],
  });
}
