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

const DAY_MS = 24 * 60 * 60 * 1000;

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * DAY_MS);
}

interface TournamentSeed {
  name: string;
  description: string;
  location: string;
  startDate: Date;
  endDate: Date;
  registrationStart: Date;
  registrationEnd: Date;
  status: string;
  courtCount: number;
}

const SEED_TOURNAMENTS: TournamentSeed[] = [
  {
    name: "Classique BSL 2025",
    description:
      "Le tournoi classique annuel du Bas-Saint-Laurent, édition 2025. Tous niveaux bienvenus.",
    location: "Centre sportif de Rimouski",
    startDate: daysFromNow(-90),
    endDate: daysFromNow(-89),
    registrationStart: daysFromNow(-120),
    registrationEnd: daysFromNow(-95),
    status: "completed",
    courtCount: 8,
  },
  {
    name: "Open de Rimouski 2026",
    description:
      "Le tournoi annuel de badminton ouvert à tous les niveaux dans la grande région de Rimouski.",
    location: "Centre sportif de Rimouski",
    startDate: daysFromNow(-1),
    endDate: daysFromNow(1),
    registrationStart: daysFromNow(-30),
    registrationEnd: daysFromNow(-3),
    status: "in_progress",
    courtCount: 6,
  },
  {
    name: "Défi Printanier 2026",
    description:
      "Tournoi printanier amical. Ouvert aux inscriptions pour joueurs de tous niveaux.",
    location: "Gymnase du Cégep de Rimouski",
    startDate: daysFromNow(21),
    endDate: daysFromNow(22),
    registrationStart: daysFromNow(-7),
    registrationEnd: daysFromNow(14),
    status: "registration_open",
    courtCount: 6,
  },
  {
    name: "Championnat BSL 2026",
    description:
      "Championnat régional du Bas-Saint-Laurent. Réservé aux membres des clubs de la région.",
    location: "Complexe sportif de Rivière-du-Loup",
    startDate: daysFromNow(60),
    endDate: daysFromNow(61),
    registrationStart: daysFromNow(30),
    registrationEnd: daysFromNow(50),
    status: "draft",
    courtCount: 8,
  },
  {
    name: "Tournoi des Fêtes 2026",
    description:
      "Tournoi festif de fin d'année. Ambiance décontractée et matchs compétitifs.",
    location: "Centre sportif de Rimouski",
    startDate: daysFromNow(7),
    endDate: daysFromNow(8),
    registrationStart: daysFromNow(-21),
    registrationEnd: daysFromNow(-1),
    status: "registration_closed",
    courtCount: 6,
  },
];

export async function seedTournaments(db: Database, clubId: string) {
  const seedValues = SEED_TOURNAMENTS.map((t) => ({
    clubId,
    name: t.name,
    description: t.description,
    location: t.location,
    startDate: t.startDate,
    endDate: t.endDate,
    registrationStart: t.registrationStart,
    registrationEnd: t.registrationEnd,
    status: t.status,
    settings: { courtCount: t.courtCount },
  }));

  const createdTournaments = await db
    .insert(tournaments)
    .values(seedValues)
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
