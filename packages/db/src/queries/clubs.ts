import { eq } from "drizzle-orm";
import type { Database } from "../index";
import { clubs } from "../schema/clubs";
import { clubMemberships } from "../schema/club-memberships";

export function getClubBySlug(db: Database, slug: string) {
  return db.query.clubs.findFirst({
    where: eq(clubs.slug, slug),
  });
}

export function getClubById(db: Database, id: string) {
  return db.query.clubs.findFirst({
    where: eq(clubs.id, id),
  });
}

export function listClubs(db: Database) {
  return db.query.clubs.findMany({
    orderBy: (clubs, { asc }) => [asc(clubs.name)],
  });
}

export function createClub(
  db: Database,
  data: typeof clubs.$inferInsert,
) {
  return db.insert(clubs).values(data).returning();
}

export function updateClub(
  db: Database,
  id: string,
  data: Partial<Omit<typeof clubs.$inferInsert, "id">>,
) {
  return db
    .update(clubs)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(clubs.id, id))
    .returning();
}

export function getClubMembership(
  db: Database,
  userId: string,
  clubId: string,
) {
  return db.query.clubMemberships.findFirst({
    where: (m, { and, eq }) =>
      and(eq(m.userId, userId), eq(m.clubId, clubId)),
  });
}

export function getClubsByUserId(db: Database, userId: string) {
  return db.query.clubMemberships.findMany({
    where: eq(clubMemberships.userId, userId),
  });
}

export function addClubMember(
  db: Database,
  data: typeof clubMemberships.$inferInsert,
) {
  return db.insert(clubMemberships).values(data).returning();
}
