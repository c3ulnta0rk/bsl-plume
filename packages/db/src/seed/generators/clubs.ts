import type { Database } from "../../index";
import { clubs } from "../../schema/clubs";
import { clubMemberships } from "../../schema/club-memberships";

const SEED_CLUBS = [
  {
    name: "Club de Badminton du Bas-Saint-Laurent",
    slug: "bsl-badminton",
    description: "Le club de badminton de la région du Bas-Saint-Laurent",
    location: "Rimouski, QC",
    primaryColor: "#1e40af",
    secondaryColor: "#f59e0b",
  },
  {
    name: "Volants de Rivière-du-Loup",
    slug: "volants-rdl",
    description: "Club de badminton de Rivière-du-Loup",
    location: "Rivière-du-Loup, QC",
    primaryColor: "#059669",
    secondaryColor: "#dc2626",
  },
];

export async function seedClubs(db: Database, adminUserId: string) {
  const createdClubs = await db.insert(clubs).values(SEED_CLUBS).returning();

  // Add admin to first club
  if (createdClubs[0]) {
    await db.insert(clubMemberships).values({
      userId: adminUserId,
      clubId: createdClubs[0].id,
      role: "admin",
    });
  }

  return createdClubs;
}
