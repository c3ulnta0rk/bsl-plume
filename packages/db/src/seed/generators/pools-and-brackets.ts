import { eq } from "drizzle-orm";
import type { Database } from "../../index";
import { pools, poolEntries } from "../../schema/pools";
import { brackets } from "../../schema/brackets";
import { matches } from "../../schema/matches";
import { generateScore, totalPoints } from "./scores";

// ---------------------------------------------------------------------------
// Pools
// ---------------------------------------------------------------------------

interface PoolSeedOpts {
  completeAll?: boolean;
}

/**
 * Seed N pools for a category with round-robin matches.
 * Uses snake draft to distribute players evenly.
 * Returns qualified player IDs (top `qualifyCount` per pool by wins then diff).
 */
export async function seedPoolsForCategory(
  db: Database,
  categoryId: string,
  playerIds: string[],
  poolCount: number,
  qualifyCount: number,
  opts: PoolSeedOpts = {},
) {
  const { completeAll = false } = opts;

  // Snake draft distribution
  const distributed: string[][] = Array.from({ length: poolCount }, () => []);
  for (let i = 0; i < playerIds.length; i++) {
    const round = Math.floor(i / poolCount);
    const poolIndex = round % 2 === 0 ? i % poolCount : poolCount - 1 - (i % poolCount);
    distributed[poolIndex]!.push(playerIds[i]!);
  }

  const qualifiedPlayerIds: string[] = [];

  for (let p = 0; p < poolCount; p++) {
    const poolPlayers = distributed[p]!;
    const poolName = String.fromCharCode(65 + p); // A, B, C...

    const [pool] = await db
      .insert(pools)
      .values({
        categoryId,
        name: poolName,
        status: completeAll ? "completed" : "pending",
        size: poolPlayers.length,
      })
      .returning();

    if (!pool) continue;

    // Create pool entries
    const entryRows = poolPlayers.map((playerId) => ({
      poolId: pool.id,
      playerId,
    }));
    const createdEntries = await db
      .insert(poolEntries)
      .values(entryRows)
      .returning();

    // Generate round-robin matches
    const matchValues: Array<{
      poolId: string;
      round: number;
      position: number;
      participant1Id: string;
      participant2Id: string;
      status: string;
      scoreSet1P1: number | null;
      scoreSet1P2: number | null;
      scoreSet2P1: number | null;
      scoreSet2P2: number | null;
      scoreSet3P1: number | null;
      scoreSet3P2: number | null;
      winnerId: string | null;
    }> = [];

    let matchPos = 0;
    for (let i = 0; i < poolPlayers.length; i++) {
      for (let j = i + 1; j < poolPlayers.length; j++) {
        const p1 = poolPlayers[i]!;
        const p2 = poolPlayers[j]!;

        if (completeAll) {
          const winnerSide = Math.random() < 0.5 ? 1 : 2 as const;
          const score = generateScore(winnerSide);
          matchValues.push({
            poolId: pool.id,
            round: 1,
            position: matchPos,
            participant1Id: p1,
            participant2Id: p2,
            status: "completed",
            ...score,
            winnerId: winnerSide === 1 ? p1 : p2,
          });
        } else {
          matchValues.push({
            poolId: pool.id,
            round: 1,
            position: matchPos,
            participant1Id: p1,
            participant2Id: p2,
            status: "scheduled",
            scoreSet1P1: null,
            scoreSet1P2: null,
            scoreSet2P1: null,
            scoreSet2P2: null,
            scoreSet3P1: null,
            scoreSet3P2: null,
            winnerId: null,
          });
        }
        matchPos++;
      }
    }

    if (matchValues.length > 0) {
      await db.insert(matches).values(matchValues);
    }

    // Update pool entry stats if completed
    if (completeAll) {
      const stats = new Map<
        string,
        { wins: number; losses: number; pf: number; pa: number }
      >();
      for (const pid of poolPlayers) {
        stats.set(pid, { wins: 0, losses: 0, pf: 0, pa: 0 });
      }

      for (const m of matchValues) {
        const score = {
          scoreSet1P1: m.scoreSet1P1!,
          scoreSet1P2: m.scoreSet1P2!,
          scoreSet2P1: m.scoreSet2P1!,
          scoreSet2P2: m.scoreSet2P2!,
          scoreSet3P1: m.scoreSet3P1,
          scoreSet3P2: m.scoreSet3P2,
        };
        const pts = totalPoints(score);
        const s1 = stats.get(m.participant1Id)!;
        const s2 = stats.get(m.participant2Id)!;
        s1.pf += pts.p1;
        s1.pa += pts.p2;
        s2.pf += pts.p2;
        s2.pa += pts.p1;
        if (m.winnerId === m.participant1Id) {
          s1.wins++;
          s2.losses++;
        } else {
          s2.wins++;
          s1.losses++;
        }
      }

      // Rank players: sort by wins desc, then point diff desc
      const ranked = [...stats.entries()].sort(([, a], [, b]) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.pf - b.pa - (a.pf - a.pa);
      });

      for (let r = 0; r < ranked.length; r++) {
        const [playerId, s] = ranked[r]!;
        const entry = createdEntries.find((e) => e.playerId === playerId);
        if (!entry) continue;

        const isQualified = r < qualifyCount;
        await db
          .update(poolEntries)
          .set({
            wins: s.wins,
            losses: s.losses,
            pointsFor: s.pf,
            pointsAgainst: s.pa,
            rank: r + 1,
            isQualified,
          })
          .where(eq(poolEntries.id, entry.id));

        if (isQualified) {
          qualifiedPlayerIds.push(playerId);
        }
      }
    }
  }

  return qualifiedPlayerIds;
}

// ---------------------------------------------------------------------------
// Brackets
// ---------------------------------------------------------------------------

interface BracketSeedOpts {
  /** Number of rounds to complete (0 = none, Infinity = all) */
  completedRounds?: number;
  /** Court number to assign to in_progress matches */
  inProgressCourt?: number;
}

/**
 * Seed a single-elimination bracket for a category.
 * Standard seeding order: 1v8, 4v5, 2v7, 3v6 (for 8 players).
 * Handles byes for non-power-of-2 counts.
 */
export async function seedBracketForCategory(
  db: Database,
  categoryId: string,
  qualifiedPlayerIds: string[],
  opts: BracketSeedOpts = {},
) {
  const { completedRounds = 0, inProgressCourt } = opts;
  const n = qualifiedPlayerIds.length;
  if (n < 2) return null;

  const bracketSize = nextPowerOf2(n);
  const roundCount = Math.ceil(Math.log2(bracketSize));

  const [bracket] = await db
    .insert(brackets)
    .values({
      categoryId,
      type: "main",
      roundCount,
      status: completedRounds >= roundCount ? "completed" : "in_progress",
    })
    .returning();

  if (!bracket) return null;

  // Build seeding order
  const seeded = buildSeedOrder(bracketSize);
  const players: Array<string | null> = seeded.map((seed) =>
    seed <= n ? qualifiedPlayerIds[seed - 1]! : null,
  );

  // Create all match slots round by round
  // matchSlots[round][position] = matchId
  const matchSlots: string[][] = [];

  for (let round = 1; round <= roundCount; round++) {
    const matchCount = bracketSize / Math.pow(2, round);
    const roundSlots: string[] = [];

    for (let pos = 0; pos < matchCount; pos++) {
      let p1: string | null = null;
      let p2: string | null = null;

      if (round === 1) {
        p1 = players[pos * 2] ?? null;
        p2 = players[pos * 2 + 1] ?? null;
      }

      // Determine if this is a bye (round 1 only)
      const isBye = round === 1 && (p1 === null) !== (p2 === null);
      const winnerId = isBye ? (p1 ?? p2) : null;
      const status = isBye ? "completed" : "scheduled";

      const [match] = await db
        .insert(matches)
        .values({
          bracketId: bracket.id,
          round,
          position: pos,
          participant1Id: p1,
          participant2Id: p2,
          status,
          winnerId,
        })
        .returning();

      roundSlots.push(match!.id);
    }

    matchSlots.push(roundSlots);
  }

  // Link nextMatchId: match at round R, position P feeds into round R+1, position floor(P/2)
  for (let round = 0; round < roundCount - 1; round++) {
    const currentSlots = matchSlots[round]!;
    const nextSlots = matchSlots[round + 1]!;

    for (let pos = 0; pos < currentSlots.length; pos++) {
      const nextPos = Math.floor(pos / 2);
      await db
        .update(matches)
        .set({ nextMatchId: nextSlots[nextPos]! })
        .where(eq(matches.id, currentSlots[pos]!));
    }
  }

  // Advance byes in round 1 to round 2
  const round1 = matchSlots[0]!;
  const round2 = matchSlots[1];
  if (round2) {
    for (let pos = 0; pos < round1.length; pos++) {
      const matchId = round1[pos]!;
      const matchData = await db
        .select()
        .from(matches)
        .where(eq(matches.id, matchId))
        .then((rows) => rows[0]);

      if (matchData?.status === "completed" && matchData.winnerId) {
        const nextPos = Math.floor(pos / 2);
        const nextMatchId = round2[nextPos]!;
        const isTopSlot = pos % 2 === 0;
        await db
          .update(matches)
          .set(
            isTopSlot
              ? { participant1Id: matchData.winnerId }
              : { participant2Id: matchData.winnerId },
          )
          .where(eq(matches.id, nextMatchId));
      }
    }
  }

  // Complete rounds
  for (let round = 1; round <= completedRounds && round <= roundCount; round++) {
    const roundIdx = round - 1;
    const currentSlots = matchSlots[roundIdx]!;

    for (let pos = 0; pos < currentSlots.length; pos++) {
      const matchId = currentSlots[pos]!;
      const matchData = await db
        .select()
        .from(matches)
        .where(eq(matches.id, matchId))
        .then((rows) => rows[0]);

      if (!matchData || matchData.status === "completed") continue;
      if (!matchData.participant1Id || !matchData.participant2Id) continue;

      const winnerSide = Math.random() < 0.5 ? 1 : 2 as const;
      const score = generateScore(winnerSide);
      const winnerId =
        winnerSide === 1 ? matchData.participant1Id : matchData.participant2Id;

      await db
        .update(matches)
        .set({
          ...score,
          winnerId,
          status: "completed",
        })
        .where(eq(matches.id, matchId));

      // Advance winner to next round
      const nextRoundSlots = matchSlots[roundIdx + 1];
      if (nextRoundSlots) {
        const nextPos = Math.floor(pos / 2);
        const nextMatchId = nextRoundSlots[nextPos]!;
        const isTopSlot = pos % 2 === 0;
        await db
          .update(matches)
          .set(
            isTopSlot
              ? { participant1Id: winnerId }
              : { participant2Id: winnerId },
          )
          .where(eq(matches.id, nextMatchId));
      }
    }
  }

  // Set in_progress matches for the next incomplete round
  if (completedRounds < roundCount && inProgressCourt !== undefined) {
    const nextRoundIdx = completedRounds;
    const nextRoundSlots = matchSlots[nextRoundIdx];
    if (nextRoundSlots) {
      // Mark first match with both participants as in_progress
      for (const matchId of nextRoundSlots) {
        const matchData = await db
          .select()
          .from(matches)
          .where(eq(matches.id, matchId))
          .then((rows) => rows[0]);

        if (
          matchData &&
          matchData.status === "scheduled" &&
          matchData.participant1Id &&
          matchData.participant2Id
        ) {
          await db
            .update(matches)
            .set({
              status: "in_progress",
              courtNumber: inProgressCourt,
              startedAt: new Date(),
            })
            .where(eq(matches.id, matchId));
          break; // Only one match in progress
        }
      }
    }
  }

  return bracket;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nextPowerOf2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * Build standard bracket seeding order for `size` slots.
 * For size=8: [1, 8, 4, 5, 2, 7, 3, 6]
 * Ensures seed 1 meets seed 8, seed 4 meets seed 5, etc.
 */
function buildSeedOrder(size: number): number[] {
  if (size === 1) return [1];
  if (size === 2) return [1, 2];

  const result: number[] = [1, 2];
  for (let round = 1; round < Math.log2(size); round++) {
    const nextResult: number[] = [];
    const sum = Math.pow(2, round + 1) + 1;
    for (const seed of result) {
      nextResult.push(seed);
      nextResult.push(sum - seed);
    }
    result.length = 0;
    result.push(...nextResult);
  }
  return result;
}
