import type { Database } from "../../index";
import { tournaments } from "../../schema/tournaments";
import { categories } from "../../schema/categories";
import { courts } from "../../schema/courts";

const CATEGORY_CONFIGS = [
  { type: "SH", maxPlayers: 32 },
  { type: "SD", maxPlayers: 32 },
  { type: "DH", maxPlayers: 16 },
  { type: "DD", maxPlayers: 16 },
  { type: "DX", maxPlayers: 16 },
];

export async function seedTournaments(db: Database, clubId: string) {
  const now = new Date();
  const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const threeWeeks = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);
  const seedTournaments = [
    {
      clubId,
      name: "Open de Rimouski 2026",
      description:
        "Le tournoi annuel de badminton ouvert à tous les niveaux dans la grande région de Rimouski.",
      location: "Centre sportif de Rimouski",
      startDate: threeWeeks,
      endDate: new Date(threeWeeks.getTime() + 24 * 60 * 60 * 1000),
      registrationStart: now,
      registrationEnd: twoWeeks,
      status: "registration_open",
      settings: { courtCount: 6 },
    },
    {
      clubId,
      name: "Championnat BSL 2026",
      description:
        "Championnat régional du Bas-Saint-Laurent. Réservé aux membres des clubs de la région.",
      location: "Complexe sportif de Rivière-du-Loup",
      startDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 61 * 24 * 60 * 60 * 1000),
      registrationStart: twoWeeks,
      registrationEnd: new Date(now.getTime() + 50 * 24 * 60 * 60 * 1000),
      status: "draft",
      settings: { courtCount: 8 },
    },
  ];

  const createdTournaments = await db
    .insert(tournaments)
    .values(seedTournaments)
    .returning();

  // Add categories and courts to each tournament
  for (const tournament of createdTournaments) {
    await db.insert(categories).values(
      CATEGORY_CONFIGS.map((cat) => ({
        tournamentId: tournament.id,
        type: cat.type,
        maxPlayers: cat.maxPlayers,
      })),
    );

    const courtCount =
      (tournament.settings as { courtCount?: number } | null)?.courtCount ?? 4;
    await db.insert(courts).values(
      Array.from({ length: courtCount }, (_, i) => ({
        tournamentId: tournament.id,
        number: i + 1,
        name: `Terrain ${i + 1}`,
        status: "available",
      })),
    );
  }

  return createdTournaments;
}
