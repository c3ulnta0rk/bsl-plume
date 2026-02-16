import { describe, it, expect } from "vitest";
import { withRollback } from "../test-utils";
import { createClub } from "./clubs";
import { createTournament } from "./tournaments";
import { createCategory } from "./categories";
import { createPlayer } from "./players";
import { createPool } from "./pools";
import { createMatch } from "./matches";
import {
  createCourt,
  createCourts,
  getCourtById,
  listCourtsByTournament,
  getAvailableCourts,
  assignCourtToMatch,
  releaseCourt,
} from "./courts";

describe("courts queries", () => {
  async function setupCourtContext(tx: Parameters<typeof createClub>[0]) {
    const [club] = await createClub(tx, {
      name: "Court Club",
      slug: "court-club-" + Date.now(),
    });
    const [tournament] = await createTournament(tx, {
      clubId: club!.id,
      name: "Court Tournament",
      startDate: new Date("2026-04-15"),
      endDate: new Date("2026-04-16"),
      registrationStart: new Date("2026-03-01"),
      registrationEnd: new Date("2026-04-10"),
      status: "in_progress",
    });
    return { club: club!, tournament: tournament! };
  }

  it("should create and retrieve a court by id", async () => {
    await withRollback(async (tx) => {
      const { tournament } = await setupCourtContext(tx);
      const [court] = await createCourt(tx, {
        tournamentId: tournament.id,
        number: 1,
        name: "Court 1",
        status: "available",
      });
      expect(court).toBeDefined();

      const found = await getCourtById(tx, court!.id);
      expect(found).toBeDefined();
      expect(found!.name).toBe("Court 1");
    });
  });

  it("should batch create courts", async () => {
    await withRollback(async (tx) => {
      const { tournament } = await setupCourtContext(tx);
      const courts = await createCourts(tx, [
        { tournamentId: tournament.id, number: 1, name: "Court 1" },
        { tournamentId: tournament.id, number: 2, name: "Court 2" },
        { tournamentId: tournament.id, number: 3, name: "Court 3" },
      ]);
      expect(courts).toHaveLength(3);
    });
  });

  it("should list courts by tournament ordered by number", async () => {
    await withRollback(async (tx) => {
      const { tournament } = await setupCourtContext(tx);
      await createCourts(tx, [
        { tournamentId: tournament.id, number: 3, name: "Court 3" },
        { tournamentId: tournament.id, number: 1, name: "Court 1" },
        { tournamentId: tournament.id, number: 2, name: "Court 2" },
      ]);

      const list = await listCourtsByTournament(tx, tournament.id);
      expect(list).toHaveLength(3);
      expect(list[0]!.number).toBe(1);
      expect(list[1]!.number).toBe(2);
      expect(list[2]!.number).toBe(3);
    });
  });

  it("should get only available courts", async () => {
    await withRollback(async (tx) => {
      const { tournament } = await setupCourtContext(tx);
      await createCourts(tx, [
        {
          tournamentId: tournament.id,
          number: 1,
          name: "Court 1",
          status: "available",
        },
        {
          tournamentId: tournament.id,
          number: 2,
          name: "Court 2",
          status: "in_use",
        },
        {
          tournamentId: tournament.id,
          number: 3,
          name: "Court 3",
          status: "available",
        },
      ]);

      const available = await getAvailableCourts(tx, tournament.id);
      expect(available).toHaveLength(2);
      expect(available.every((c) => c.status === "available")).toBe(true);
    });
  });

  it("should assign a court to a match", async () => {
    await withRollback(async (tx) => {
      const { tournament } = await setupCourtContext(tx);
      const [category] = await createCategory(tx, {
        tournamentId: tournament.id,
        type: "SH",
        maxPlayers: 32,
      });
      const [pool] = await createPool(tx, {
        categoryId: category!.id,
        name: "A",
        size: 4,
        status: "active",
      });
      const [p1] = await createPlayer(tx, {
        userId: "550e8400-e29b-41d4-a716-446655440050",
        firstName: "X",
        lastName: "Y",
      });
      const [match] = await createMatch(tx, {
        poolId: pool!.id,
        round: 1,
        position: 0,
        participant1Id: p1!.id,
        status: "scheduled",
      });
      const [court] = await createCourt(tx, {
        tournamentId: tournament.id,
        number: 1,
        name: "Court 1",
        status: "available",
      });

      const [assigned] = await assignCourtToMatch(
        tx,
        court!.id,
        match!.id,
      );
      expect(assigned!.status).toBe("in_use");
      expect(assigned!.currentMatchId).toBe(match!.id);
    });
  });

  it("should release a court", async () => {
    await withRollback(async (tx) => {
      const { tournament } = await setupCourtContext(tx);
      const [court] = await createCourt(tx, {
        tournamentId: tournament.id,
        number: 1,
        name: "Court 1",
        status: "in_use",
      });

      const [released] = await releaseCourt(tx, court!.id);
      expect(released!.status).toBe("available");
      expect(released!.currentMatchId).toBeNull();
    });
  });

  it("should return empty array for tournament with no courts", async () => {
    await withRollback(async (tx) => {
      const { tournament } = await setupCourtContext(tx);
      const list = await listCourtsByTournament(tx, tournament.id);
      expect(list).toHaveLength(0);
    });
  });
});
