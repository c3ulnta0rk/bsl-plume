import { sql } from "drizzle-orm";
import type { Database } from "../../index";
import { seedClubs } from "../generators/clubs";
import { seedTournaments } from "../generators/tournaments";
import { seedPlayers } from "../generators/players";
import { categories } from "../../schema/categories";
import { eq } from "drizzle-orm";

export async function seedDevelopment(db: Database) {
  console.log("Clearing existing data...");
  await db.execute(sql`
    TRUNCATE clubs, club_memberships, tournaments, categories, players,
    registrations, pools, pool_entries, brackets, matches, courts, notifications
    CASCADE
  `);

  // Use a placeholder admin user ID (will be replaced when Better Auth creates real users)
  const adminUserId = "00000000-0000-0000-0000-000000000001";

  console.log("Seeding clubs...");
  const clubs = await seedClubs(db, adminUserId);
  const mainClub = clubs[0]!;

  console.log("Seeding tournaments...");
  const tournaments = await seedTournaments(db, mainClub.id);
  const openTournament = tournaments[0]!;

  // Get category IDs for the open tournament
  const tournamentCategories = await db
    .select()
    .from(categories)
    .where(eq(categories.tournamentId, openTournament.id));

  const categoryIds = tournamentCategories.map((c) => c.id);

  console.log("Seeding players and registrations...");
  await seedPlayers(db, 30, categoryIds);

  console.log("Development seed complete:");
  console.log(`  - ${clubs.length} clubs`);
  console.log(`  - ${tournaments.length} tournaments`);
  console.log(`  - ${tournamentCategories.length} categories`);
  console.log(`  - 30 players with registrations`);
}
