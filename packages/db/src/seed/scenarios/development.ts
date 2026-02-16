import { eq, sql } from "drizzle-orm";
import type { Database } from "../../index";
import { seedClubs } from "../generators/clubs";
import { seedTournaments } from "../generators/tournaments";
import { seedPlayers, type RegistrationConfig } from "../generators/players";
import {
  seedPoolsForCategory,
  seedBracketForCategory,
} from "../generators/pools-and-brackets";
import { categories } from "../../schema/categories";
import { registrations } from "../../schema/registrations";

export async function seedDevelopment(db: Database) {
  console.log("Clearing existing data...");
  await db.execute(sql`
    TRUNCATE clubs, club_memberships, tournaments, categories, players,
    registrations, pools, pool_entries, brackets, matches, courts, notifications
    CASCADE
  `);

  const adminUserId = "00000000-0000-0000-0000-000000000001";

  console.log("Seeding clubs...");
  const clubs = await seedClubs(db, adminUserId);
  const mainClub = clubs[0]!;

  console.log("Seeding 5 tournaments...");
  const allTournaments = await seedTournaments(db, mainClub.id);

  // Index tournaments by status
  const completed = allTournaments.find((t) => t.status === "completed")!;
  const inProgress = allTournaments.find((t) => t.status === "in_progress")!;
  const regOpen = allTournaments.find(
    (t) => t.status === "registration_open",
  )!;
  const regClosed = allTournaments.find(
    (t) => t.status === "registration_closed",
  )!;

  // Get categories per tournament
  const completedCats = await db
    .select()
    .from(categories)
    .where(eq(categories.tournamentId, completed.id));
  const inProgressCats = await db
    .select()
    .from(categories)
    .where(eq(categories.tournamentId, inProgress.id));
  const regOpenCats = await db
    .select()
    .from(categories)
    .where(eq(categories.tournamentId, regOpen.id));
  const regClosedCats = await db
    .select()
    .from(categories)
    .where(eq(categories.tournamentId, regClosed.id));

  // Completed tournament: SH(16), SD(16), DH(16) — full brackets with 8e, quarts, demis, finale
  const completedSH = completedCats.find((c) => c.type === "SH")!;
  const completedSD = completedCats.find((c) => c.type === "SD")!;
  const completedDH = completedCats.find((c) => c.type === "DH")!;

  // In progress tournament: SH(16), SD(8) — SH has quarts done, SD has pools done
  const inProgressSH = inProgressCats.find((c) => c.type === "SH")!;
  const inProgressSD = inProgressCats.find((c) => c.type === "SD")!;

  // Registration open: SH(10), SD(8)
  const regOpenSH = regOpenCats.find((c) => c.type === "SH")!;
  const regOpenSD = regOpenCats.find((c) => c.type === "SD")!;

  // Registration closed: SH(12), SD(8)
  const regClosedSH = regClosedCats.find((c) => c.type === "SH")!;
  const regClosedSD = regClosedCats.find((c) => c.type === "SD")!;

  // Build registration configs — need ~100 players total
  const registrationConfigs: RegistrationConfig[] = [
    // Completed: 16 per cat × 3 cats = 48 slots (players reused across cats)
    { categoryId: completedSH.id, playerCount: 16, status: "confirmed" },
    { categoryId: completedSD.id, playerCount: 16, status: "confirmed" },
    { categoryId: completedDH.id, playerCount: 16, status: "confirmed" },
    // In progress: SH(16), SD(8)
    { categoryId: inProgressSH.id, playerCount: 16, status: "confirmed" },
    { categoryId: inProgressSD.id, playerCount: 8, status: "confirmed" },
    // Registration open: SH(10), SD(8)
    { categoryId: regOpenSH.id, playerCount: 10, status: "mixed" },
    { categoryId: regOpenSD.id, playerCount: 8, status: "mixed" },
    // Registration closed: SH(12), SD(8)
    { categoryId: regClosedSH.id, playerCount: 12, status: "confirmed" },
    { categoryId: regClosedSD.id, playerCount: 8, status: "confirmed" },
  ];

  console.log("Seeding 80 players with targeted registrations...");
  await seedPlayers(db, 80, registrationConfigs);

  async function getConfirmedPlayerIds(categoryId: string): Promise<string[]> {
    const regs = await db
      .select()
      .from(registrations)
      .where(eq(registrations.categoryId, categoryId));
    return regs
      .filter((r) => r.status === "confirmed")
      .map((r) => r.playerId);
  }

  // Helper: seed pools + bracket for a fully completed category
  async function seedCompletedCategory(
    categoryId: string,
    label: string,
    playerCount: number,
  ) {
    console.log(`  Seeding completed ${label}...`);
    const playerIds = await getConfirmedPlayerIds(categoryId);
    const poolCount = Math.floor(playerCount / 4);
    const qualifyPerPool = 2;

    const qualified = await seedPoolsForCategory(
      db,
      categoryId,
      playerIds.slice(0, playerCount),
      poolCount,
      qualifyPerPool,
      { completeAll: true },
    );

    const bracketPlayers = qualified.slice(0, 8);
    if (bracketPlayers.length >= 4) {
      await seedBracketForCategory(db, categoryId, bracketPlayers, {
        completedRounds: Infinity,
      });
    }
  }

  // --- COMPLETED TOURNAMENT ---
  // 3 categories fully played: 4 pools of 4, bracket of 8 (quarts→demis→finale)
  console.log("Seeding completed tournament (SH, SD, DH)...");
  await seedCompletedCategory(completedSH.id, "SH", 16);
  await seedCompletedCategory(completedSD.id, "SD", 16);
  await seedCompletedCategory(completedDH.id, "DH", 16);

  // --- IN PROGRESS TOURNAMENT ---
  // SH: 4 pools of 4 done → bracket of 8, quarts done, demis in_progress
  console.log("Seeding in-progress tournament (SH, SD)...");
  console.log("  Seeding in-progress SH...");
  const ipSHPlayers = await getConfirmedPlayerIds(inProgressSH.id);
  const ipSHQualified = await seedPoolsForCategory(
    db,
    inProgressSH.id,
    ipSHPlayers.slice(0, 16),
    4,
    2,
    { completeAll: true },
  );
  const ipSHBracket = ipSHQualified.slice(0, 8);
  if (ipSHBracket.length >= 4) {
    await seedBracketForCategory(db, inProgressSH.id, ipSHBracket, {
      completedRounds: 1, // quarts done, semis next
      inProgressCourt: 1,
    });
  }

  // SD: 2 pools of 4 done → bracket of 4, semis scheduled
  console.log("  Seeding in-progress SD...");
  const ipSDPlayers = await getConfirmedPlayerIds(inProgressSD.id);
  const ipSDQualified = await seedPoolsForCategory(
    db,
    inProgressSD.id,
    ipSDPlayers.slice(0, 8),
    2,
    2,
    { completeAll: true },
  );
  const ipSDBracket = ipSDQualified.slice(0, 4);
  if (ipSDBracket.length >= 4) {
    await seedBracketForCategory(db, inProgressSD.id, ipSDBracket, {
      completedRounds: 0, // nothing played yet in bracket
    });
  }

  const totalRegs = await db.select().from(registrations);

  console.log("Development seed complete:");
  console.log(`  - ${clubs.length} clubs`);
  console.log(`  - ${allTournaments.length} tournaments`);
  console.log(
    `  - ${completedCats.length + inProgressCats.length + regOpenCats.length + regClosedCats.length} categories`,
  );
  console.log(`  - 80 players`);
  console.log(`  - ${totalRegs.length} registrations`);
  console.log(
    `  - Completed: SH/SD/DH — 4 pools + bracket of 8, fully played`,
  );
  console.log(`  - In progress: SH — quarts done, semis in progress`);
  console.log(`  - In progress: SD — pools done, bracket scheduled`);
}
