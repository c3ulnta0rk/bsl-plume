import { describe, it, expect } from "vitest";
import { withRollback } from "../test-utils";
import { createClub } from "./clubs";
import { createTournament } from "./tournaments";
import {
  createCategory,
  createCategories,
  getCategoryById,
  listCategoriesByTournament,
} from "./categories";

describe("categories queries", () => {
  async function createTestTournament(
    tx: Parameters<typeof createClub>[0],
  ) {
    const [club] = await createClub(tx, {
      name: "Test Club",
      slug: "cat-test-club-" + Date.now(),
    });
    const [tournament] = await createTournament(tx, {
      clubId: club!.id,
      name: "Test Tournament",
      startDate: new Date("2026-04-15"),
      endDate: new Date("2026-04-16"),
      registrationStart: new Date("2026-03-01"),
      registrationEnd: new Date("2026-04-10"),
      status: "draft",
    });
    return tournament!;
  }

  it("should create and retrieve a category by id", async () => {
    await withRollback(async (tx) => {
      const tournament = await createTestTournament(tx);
      const [category] = await createCategory(tx, {
        tournamentId: tournament.id,
        type: "SH",
        maxPlayers: 32,
      });
      expect(category).toBeDefined();

      const found = await getCategoryById(tx, category!.id);
      expect(found).toBeDefined();
      expect(found!.type).toBe("SH");
    });
  });

  it("should batch create categories", async () => {
    await withRollback(async (tx) => {
      const tournament = await createTestTournament(tx);
      const cats = await createCategories(tx, [
        { tournamentId: tournament.id, type: "SH", maxPlayers: 32 },
        { tournamentId: tournament.id, type: "SD", maxPlayers: 32 },
        { tournamentId: tournament.id, type: "DX", maxPlayers: 16 },
      ]);
      expect(cats).toHaveLength(3);
    });
  });

  it("should list categories by tournament ordered by type ASC", async () => {
    await withRollback(async (tx) => {
      const tournament = await createTestTournament(tx);
      await createCategories(tx, [
        { tournamentId: tournament.id, type: "SH", maxPlayers: 32 },
        { tournamentId: tournament.id, type: "DD", maxPlayers: 16 },
        { tournamentId: tournament.id, type: "DX", maxPlayers: 16 },
      ]);

      const list = await listCategoriesByTournament(tx, tournament.id);
      expect(list).toHaveLength(3);
      expect(list[0]!.type).toBe("DD");
      expect(list[1]!.type).toBe("DX");
      expect(list[2]!.type).toBe("SH");
    });
  });

  it("should return empty array for tournament with no categories", async () => {
    await withRollback(async (tx) => {
      const tournament = await createTestTournament(tx);
      const list = await listCategoriesByTournament(tx, tournament.id);
      expect(list).toHaveLength(0);
    });
  });
});
