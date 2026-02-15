import { describe, expect, it } from "vitest";
import {
  calculatePoolRankings,
  generatePools,
  qualifyFromPools,
} from "./pool";
import type { Participant, Pool, Score } from "./types";
import { MATCH_STATUSES } from "./types";

function createParticipants(
  count: number,
  options?: { withSeeds?: boolean; withClubs?: boolean },
): Participant[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `player-${i + 1}`,
    seed: options?.withSeeds ? i + 1 : undefined,
    clubId: options?.withClubs
      ? `club-${(i % 3) + 1}`
      : undefined,
  }));
}

function completePoolMatch(
  pool: Pool,
  matchIndex: number,
  score: Score,
): void {
  const match = pool.matches[matchIndex];
  if (!match) return;

  let sets1Won = 0;
  let sets2Won = 0;
  for (const set of score.sets) {
    if (set.score1 > set.score2) sets1Won++;
    else sets2Won++;
  }

  match.score = score;
  match.status = MATCH_STATUSES.COMPLETED;
  match.winnerId =
    sets1Won > sets2Won ? match.participant1?.id ?? null : match.participant2?.id ?? null;
}

describe("generatePools", () => {
  describe("basic pool generation", () => {
    it("should create the correct number of pools", () => {
      const participants = createParticipants(12);
      const pools = generatePools(participants, 4);
      expect(pools).toHaveLength(4);
    });

    it("should name pools A, B, C, D", () => {
      const participants = createParticipants(12);
      const pools = generatePools(participants, 4);
      expect(pools.map((p) => p.name)).toEqual(["A", "B", "C", "D"]);
    });

    it("should distribute all participants across pools", () => {
      const participants = createParticipants(12);
      const pools = generatePools(participants, 4);
      const totalEntries = pools.reduce(
        (sum, pool) => sum + pool.entries.length,
        0,
      );
      expect(totalEntries).toBe(12);
    });

    it("should create pools of 3 when 12 players in 4 pools", () => {
      const participants = createParticipants(12);
      const pools = generatePools(participants, 4);
      for (const pool of pools) {
        expect(pool.entries).toHaveLength(3);
      }
    });

    it("should support custom pool name prefix", () => {
      const participants = createParticipants(6);
      const pools = generatePools(participants, 2, {
        poolNamePrefix: "Pool ",
      });
      expect(pools.map((p) => p.name)).toEqual(["Pool A", "Pool B"]);
    });
  });

  describe("uneven pools", () => {
    it("should create uneven pools with max 1 player difference", () => {
      const participants = createParticipants(11);
      const pools = generatePools(participants, 4);
      const sizes = pools.map((p) => p.entries.length);
      const maxSize = Math.max(...sizes);
      const minSize = Math.min(...sizes);
      expect(maxSize - minSize).toBeLessThanOrEqual(1);
    });

    it("should handle 7 players in 2 pools (4-3 or 3-4)", () => {
      const participants = createParticipants(7);
      const pools = generatePools(participants, 2);
      const sizes = pools.map((p) => p.entries.length).sort();
      expect(sizes).toEqual([3, 4]);
    });
  });

  describe("seeded players distribution", () => {
    it("should distribute seeded players across pools", () => {
      const participants = createParticipants(8, { withSeeds: true });
      const pools = generatePools(participants, 4);

      // Top 4 seeds should be in different pools
      const topSeedPools = new Set<string>();
      for (const pool of pools) {
        for (const entry of pool.entries) {
          if (entry.participant.seed && entry.participant.seed <= 4) {
            topSeedPools.add(pool.id);
          }
        }
      }
      expect(topSeedPools.size).toBe(4);
    });
  });

  describe("same-club avoidance", () => {
    it("should try to avoid placing players from the same club in the same pool", () => {
      const participants = createParticipants(12, { withClubs: true });
      const pools = generatePools(participants, 4);

      // With 12 players from 3 clubs and 4 pools,
      // ideally max 1 player per club per pool
      for (const pool of pools) {
        const clubCounts = new Map<string, number>();
        for (const entry of pool.entries) {
          if (entry.participant.clubId) {
            const count = clubCounts.get(entry.participant.clubId) ?? 0;
            clubCounts.set(entry.participant.clubId, count + 1);
          }
        }
        for (const count of clubCounts.values()) {
          expect(count).toBeLessThanOrEqual(2);
        }
      }
    });
  });

  describe("round-robin matches", () => {
    it("should generate correct number of matches for a pool of 3", () => {
      const participants = createParticipants(3);
      const pools = generatePools(participants, 1);
      // 3 players = 3 matches (3 choose 2)
      expect(pools[0]?.matches).toHaveLength(3);
    });

    it("should generate correct number of matches for a pool of 4", () => {
      const participants = createParticipants(4);
      const pools = generatePools(participants, 1);
      // 4 players = 6 matches (4 choose 2)
      expect(pools[0]?.matches).toHaveLength(6);
    });

    it("should have all matches in scheduled status", () => {
      const participants = createParticipants(4);
      const pools = generatePools(participants, 1);
      for (const match of pools[0]?.matches ?? []) {
        expect(match.status).toBe(MATCH_STATUSES.SCHEDULED);
      }
    });

    it("should ensure every participant plays every other participant", () => {
      const participants = createParticipants(4);
      const pools = generatePools(participants, 1);
      const pool = pools[0];
      if (!pool) return;

      for (const entry of pool.entries) {
        const opponents = new Set<string>();
        for (const match of pool.matches) {
          if (match.participant1?.id === entry.participant.id) {
            if (match.participant2) opponents.add(match.participant2.id);
          }
          if (match.participant2?.id === entry.participant.id) {
            if (match.participant1) opponents.add(match.participant1.id);
          }
        }
        expect(opponents.size).toBe(pool.entries.length - 1);
      }
    });
  });

  describe("edge cases", () => {
    it("should throw when fewer than 3 participants", () => {
      expect(() => generatePools(createParticipants(2), 1)).toThrow(
        "At least 3 participants are required",
      );
    });

    it("should throw when pool count is 0", () => {
      expect(() => generatePools(createParticipants(4), 0)).toThrow(
        "Pool count must be at least 1",
      );
    });

    it("should throw when pool count exceeds participants", () => {
      expect(() => generatePools(createParticipants(3), 5)).toThrow(
        "Pool count cannot exceed number of participants",
      );
    });

    it("should handle a single pool with all players", () => {
      const participants = createParticipants(5);
      const pools = generatePools(participants, 1);
      expect(pools).toHaveLength(1);
      expect(pools[0]?.entries).toHaveLength(5);
    });
  });
});

describe("calculatePoolRankings", () => {
  it("should rank players by wins", () => {
    const participants = createParticipants(3);
    const pools = generatePools(participants, 1);
    const pool = pools[0];
    if (!pool) return;

    // Player 1 beats Player 2
    completePoolMatch(pool, 0, {
      sets: [
        { score1: 21, score2: 15 },
        { score1: 21, score2: 18 },
      ],
    });

    // Player 1 beats Player 3
    completePoolMatch(pool, 1, {
      sets: [
        { score1: 21, score2: 10 },
        { score1: 21, score2: 12 },
      ],
    });

    // Player 2 beats Player 3
    completePoolMatch(pool, 2, {
      sets: [
        { score1: 21, score2: 19 },
        { score1: 21, score2: 17 },
      ],
    });

    const rankings = calculatePoolRankings(pool);
    expect(rankings[0]?.wins).toBe(2);
    expect(rankings[1]?.wins).toBe(1);
    expect(rankings[2]?.wins).toBe(0);
  });

  it("should use point differential as tiebreaker", () => {
    const participants = createParticipants(3);
    const pools = generatePools(participants, 1);
    const pool = pools[0];
    if (!pool) return;

    // Circular: each player wins 1 match
    // Player 1 beats Player 2 by a wide margin
    completePoolMatch(pool, 0, {
      sets: [
        { score1: 21, score2: 5 },
        { score1: 21, score2: 8 },
      ],
    });

    // Player 3 beats Player 1 by a narrow margin
    completePoolMatch(pool, 1, {
      sets: [
        { score1: 19, score2: 21 },
        { score1: 20, score2: 22 },
      ],
    });

    // Player 2 beats Player 3 by a medium margin
    completePoolMatch(pool, 2, {
      sets: [
        { score1: 21, score2: 15 },
        { score1: 21, score2: 16 },
      ],
    });

    const rankings = calculatePoolRankings(pool);
    // All have 1 win, so sorted by point differential
    expect(rankings[0]?.rank).toBe(1);
    expect(rankings[1]?.rank).toBe(2);
    expect(rankings[2]?.rank).toBe(3);
  });

  it("should handle a pool with no completed matches", () => {
    const participants = createParticipants(3);
    const pools = generatePools(participants, 1);
    const pool = pools[0];
    if (!pool) return;

    const rankings = calculatePoolRankings(pool);
    expect(rankings).toHaveLength(3);
    for (const ranking of rankings) {
      expect(ranking.wins).toBe(0);
      expect(ranking.losses).toBe(0);
    }
  });
});

describe("qualifyFromPools", () => {
  it("should qualify all pool winners", () => {
    const participants = createParticipants(12);
    const pools = generatePools(participants, 4);

    // Complete all matches in each pool so one player wins all
    for (const pool of pools) {
      for (let i = 0; i < pool.matches.length; i++) {
        completePoolMatch(pool, i, {
          sets: [
            { score1: 21, score2: 15 },
            { score1: 21, score2: 18 },
          ],
        });
      }
    }

    const qualified = qualifyFromPools(pools, 4);
    expect(qualified).toHaveLength(4);
  });

  it("should include best second-place finishers to fill bracket", () => {
    const participants = createParticipants(12);
    const pools = generatePools(participants, 4);

    for (const pool of pools) {
      for (let i = 0; i < pool.matches.length; i++) {
        completePoolMatch(pool, i, {
          sets: [
            { score1: 21, score2: 15 },
            { score1: 21, score2: 18 },
          ],
        });
      }
    }

    // Need 8 players for bracket (4 winners + 4 best seconds)
    const qualified = qualifyFromPools(pools, 8);
    expect(qualified).toHaveLength(8);
  });

  it("should not duplicate participants in qualified list", () => {
    const participants = createParticipants(6);
    const pools = generatePools(participants, 2);

    for (const pool of pools) {
      for (let i = 0; i < pool.matches.length; i++) {
        completePoolMatch(pool, i, {
          sets: [
            { score1: 21, score2: 15 },
            { score1: 21, score2: 18 },
          ],
        });
      }
    }

    const qualified = qualifyFromPools(pools, 4);
    const ids = qualified.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});
