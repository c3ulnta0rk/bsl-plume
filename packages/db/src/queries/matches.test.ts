import { describe, it, expect } from "vitest";
import { withRollback } from "../test-utils";
import { createClub } from "./clubs";
import { createTournament } from "./tournaments";
import { createCategory } from "./categories";
import { createPlayer } from "./players";
import { createPool } from "./pools";
import {
  createMatch,
  createMatches,
  getMatchById,
  listMatchesByPool,
  listMatchesByBracket,
  updateMatchScore,
  assignMatchCourt,
} from "./matches";
import { createBracket } from "./brackets";

describe("matches queries", () => {
  async function setupMatchContext(tx: Parameters<typeof createClub>[0]) {
    const [club] = await createClub(tx, {
      name: "Match Club",
      slug: "match-club-" + Date.now(),
    });
    const [tournament] = await createTournament(tx, {
      clubId: club!.id,
      name: "Match Tournament",
      startDate: new Date("2026-04-15"),
      endDate: new Date("2026-04-16"),
      registrationStart: new Date("2026-03-01"),
      registrationEnd: new Date("2026-04-10"),
      status: "in_progress",
    });
    const [category] = await createCategory(tx, {
      tournamentId: tournament!.id,
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
      userId: "550e8400-e29b-41d4-a716-446655440040",
      firstName: "Player",
      lastName: "One",
    });
    const [p2] = await createPlayer(tx, {
      userId: "550e8400-e29b-41d4-a716-446655440041",
      firstName: "Player",
      lastName: "Two",
    });
    return {
      club: club!,
      tournament: tournament!,
      category: category!,
      pool: pool!,
      p1: p1!,
      p2: p2!,
    };
  }

  it("should create and retrieve a match by id", async () => {
    await withRollback(async (tx) => {
      const { pool, p1, p2 } = await setupMatchContext(tx);
      const [match] = await createMatch(tx, {
        poolId: pool.id,
        round: 1,
        position: 0,
        participant1Id: p1.id,
        participant2Id: p2.id,
        status: "scheduled",
      });
      expect(match).toBeDefined();

      const found = await getMatchById(tx, match!.id);
      expect(found).toBeDefined();
      expect(found!.participant1Id).toBe(p1.id);
    });
  });

  it("should batch create matches", async () => {
    await withRollback(async (tx) => {
      const { pool, p1, p2 } = await setupMatchContext(tx);
      const matches = await createMatches(tx, [
        {
          poolId: pool.id,
          round: 1,
          position: 0,
          participant1Id: p1.id,
          participant2Id: p2.id,
          status: "scheduled",
        },
        {
          poolId: pool.id,
          round: 1,
          position: 1,
          participant1Id: p1.id,
          participant2Id: p2.id,
          status: "scheduled",
        },
      ]);
      expect(matches).toHaveLength(2);
    });
  });

  it("should list matches by pool ordered by round and position", async () => {
    await withRollback(async (tx) => {
      const { pool, p1, p2 } = await setupMatchContext(tx);
      await createMatches(tx, [
        {
          poolId: pool.id,
          round: 1,
          position: 1,
          participant1Id: p1.id,
          participant2Id: p2.id,
          status: "scheduled",
        },
        {
          poolId: pool.id,
          round: 1,
          position: 0,
          participant1Id: p1.id,
          participant2Id: p2.id,
          status: "scheduled",
        },
      ]);

      const list = await listMatchesByPool(tx, pool.id);
      expect(list).toHaveLength(2);
      expect(list[0]!.position).toBe(0);
      expect(list[1]!.position).toBe(1);
    });
  });

  it("should list matches by bracket", async () => {
    await withRollback(async (tx) => {
      const { category, p1, p2 } = await setupMatchContext(tx);
      const [bracket] = await createBracket(tx, {
        categoryId: category.id,
        type: "main",
        roundCount: 3,
        status: "active",
      });
      await createMatch(tx, {
        bracketId: bracket!.id,
        round: 1,
        position: 0,
        participant1Id: p1.id,
        participant2Id: p2.id,
        status: "scheduled",
      });

      const list = await listMatchesByBracket(tx, bracket!.id);
      expect(list).toHaveLength(1);
    });
  });

  it("should update match score with all fields", async () => {
    await withRollback(async (tx) => {
      const { pool, p1, p2 } = await setupMatchContext(tx);
      const [match] = await createMatch(tx, {
        poolId: pool.id,
        round: 1,
        position: 0,
        participant1Id: p1.id,
        participant2Id: p2.id,
        status: "in_progress",
      });

      const [updated] = await updateMatchScore(tx, match!.id, {
        scoreSet1P1: 21,
        scoreSet1P2: 15,
        scoreSet2P1: 21,
        scoreSet2P2: 18,
        scoreSet3P1: null,
        scoreSet3P2: null,
        winnerId: p1.id,
        status: "completed",
        endedAt: new Date(),
      });

      expect(updated!.scoreSet1P1).toBe(21);
      expect(updated!.scoreSet1P2).toBe(15);
      expect(updated!.winnerId).toBe(p1.id);
      expect(updated!.status).toBe("completed");
    });
  });

  it("should assign a court to a match", async () => {
    await withRollback(async (tx) => {
      const { pool, p1, p2 } = await setupMatchContext(tx);
      const [match] = await createMatch(tx, {
        poolId: pool.id,
        round: 1,
        position: 0,
        participant1Id: p1.id,
        participant2Id: p2.id,
        status: "scheduled",
      });

      const [updated] = await assignMatchCourt(tx, match!.id, 3);
      expect(updated!.courtNumber).toBe(3);
      expect(updated!.status).toBe("in_progress");
      expect(updated!.startedAt).toBeDefined();
    });
  });

  it("should return undefined for non-existent match", async () => {
    await withRollback(async (tx) => {
      const found = await getMatchById(
        tx,
        "00000000-0000-0000-0000-000000000000",
      );
      expect(found).toBeUndefined();
    });
  });
});
