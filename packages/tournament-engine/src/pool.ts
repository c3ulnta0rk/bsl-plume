import type { Match, Participant, Pool, PoolEntry, PoolRanking } from "./types";
import { MATCH_STATUSES } from "./types";

/**
 * Generate pools from a list of participants.
 * Distributes seeded players across pools and avoids placing
 * players from the same club in the same pool when possible.
 */
export function generatePools(
  participants: Participant[],
  poolCount: number,
  options?: { poolNamePrefix?: string },
): Pool[] {
  const prefix = options?.poolNamePrefix ?? "";

  if (participants.length < 3) {
    throw new Error("At least 3 participants are required to generate pools");
  }

  if (poolCount < 1) {
    throw new Error("Pool count must be at least 1");
  }

  if (poolCount > participants.length) {
    throw new Error("Pool count cannot exceed number of participants");
  }

  const seeded = participants
    .filter((p) => p.seed !== undefined)
    .sort((a, b) => (a.seed ?? 0) - (b.seed ?? 0));
  const unseeded = participants.filter((p) => p.seed === undefined);

  const pools: Pool[] = Array.from({ length: poolCount }, (_, i) => ({
    id: `pool-${i + 1}`,
    name: `${prefix}${String.fromCharCode(65 + i)}`,
    entries: [],
    matches: [],
  }));

  // Distribute seeded players using snake draft
  for (let i = 0; i < seeded.length; i++) {
    const poolIndex = i % poolCount;
    const participant = seeded[i];
    if (participant) {
      pools[poolIndex]?.entries.push(createPoolEntry(participant));
    }
  }

  // Distribute unseeded players, trying to avoid same-club conflicts
  const shuffled = shuffleArray([...unseeded]);
  for (const participant of shuffled) {
    const bestPool = findBestPool(pools, participant, poolCount);
    bestPool.entries.push(createPoolEntry(participant));
  }

  // Generate round-robin matches for each pool
  for (const pool of pools) {
    pool.matches = generateRoundRobinMatches(pool);
  }

  return pools;
}

/**
 * Calculate pool rankings based on completed matches.
 */
export function calculatePoolRankings(pool: Pool): PoolRanking[] {
  const stats = new Map<
    string,
    {
      wins: number;
      losses: number;
      pointsFor: number;
      pointsAgainst: number;
    }
  >();

  for (const entry of pool.entries) {
    stats.set(entry.participant.id, {
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
    });
  }

  for (const match of pool.matches) {
    if (match.status !== MATCH_STATUSES.COMPLETED || !match.score) continue;

    const p1Id = match.participant1?.id;
    const p2Id = match.participant2?.id;
    if (!p1Id || !p2Id) continue;

    const p1Stats = stats.get(p1Id);
    const p2Stats = stats.get(p2Id);
    if (!p1Stats || !p2Stats) continue;

    let p1Points = 0;
    let p2Points = 0;
    let p1SetsWon = 0;
    let p2SetsWon = 0;

    for (const set of match.score.sets) {
      p1Points += set.score1;
      p2Points += set.score2;
      if (set.score1 > set.score2) p1SetsWon++;
      else if (set.score2 > set.score1) p2SetsWon++;
    }

    p1Stats.pointsFor += p1Points;
    p1Stats.pointsAgainst += p2Points;
    p2Stats.pointsFor += p2Points;
    p2Stats.pointsAgainst += p1Points;

    if (p1SetsWon > p2SetsWon) {
      p1Stats.wins++;
      p2Stats.losses++;
    } else {
      p2Stats.wins++;
      p1Stats.losses++;
    }
  }

  const rankings: PoolRanking[] = Array.from(stats.entries()).map(
    ([participantId, s]) => ({
      participantId,
      wins: s.wins,
      losses: s.losses,
      pointsFor: s.pointsFor,
      pointsAgainst: s.pointsAgainst,
      pointDifferential: s.pointsFor - s.pointsAgainst,
      rank: 0,
    }),
  );

  // Sort: wins desc, then point differential desc, then points for desc
  rankings.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.pointDifferential !== a.pointDifferential)
      return b.pointDifferential - a.pointDifferential;
    return b.pointsFor - a.pointsFor;
  });

  for (let i = 0; i < rankings.length; i++) {
    const ranking = rankings[i];
    if (ranking) {
      ranking.rank = i + 1;
    }
  }

  return rankings;
}

/**
 * Qualify pool winners and best second-place finishers for the bracket.
 */
export function qualifyFromPools(
  pools: Pool[],
  bracketSize: number,
): Participant[] {
  const allRankings = pools.map((pool) => ({
    poolId: pool.id,
    rankings: calculatePoolRankings(pool),
  }));

  const qualified: Participant[] = [];

  // First: all pool winners
  for (const { rankings } of allRankings) {
    const winner = rankings[0];
    if (winner) {
      const participant = findParticipantInPools(
        pools,
        winner.participantId,
      );
      if (participant) {
        qualified.push(participant);
      }
    }
  }

  // Then: best second-place finishers to fill the bracket
  const remaining = bracketSize - qualified.length;
  if (remaining > 0) {
    const seconds = allRankings
      .map(({ rankings }) => rankings[1])
      .filter(
        (r): r is PoolRanking =>
          r !== undefined &&
          !qualified.some((q) => q.id === r.participantId),
      )
      .sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.pointDifferential !== a.pointDifferential)
          return b.pointDifferential - a.pointDifferential;
        return b.pointsFor - a.pointsFor;
      });

    for (let i = 0; i < Math.min(remaining, seconds.length); i++) {
      const second = seconds[i];
      if (second) {
        const participant = findParticipantInPools(
          pools,
          second.participantId,
        );
        if (participant) {
          qualified.push(participant);
        }
      }
    }
  }

  return qualified;
}

// --- Internal helpers ---

function createPoolEntry(participant: Participant): PoolEntry {
  return {
    participant,
    wins: 0,
    losses: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    rank: null,
    isQualified: false,
  };
}

function findBestPool(
  pools: Pool[],
  participant: Participant,
  _poolCount: number,
): Pool {
  // Find pool with fewest entries, preferring pools without same-club players
  let bestPool = pools[0];
  if (!bestPool) throw new Error("No pools available");

  let bestScore = Number.POSITIVE_INFINITY;

  for (const pool of pools) {
    const sameClubCount = participant.clubId
      ? pool.entries.filter((e) => e.participant.clubId === participant.clubId)
          .length
      : 0;
    // Score: size * 10 + sameClubCount (lower is better)
    const score = pool.entries.length * 10 + sameClubCount;
    if (score < bestScore) {
      bestScore = score;
      bestPool = pool;
    }
  }

  return bestPool;
}

function generateRoundRobinMatches(pool: Pool): Match[] {
  const matches: Match[] = [];
  const entries = pool.entries;
  let matchIndex = 0;

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const entry1 = entries[i];
      const entry2 = entries[j];
      if (!entry1 || !entry2) continue;

      matches.push({
        id: `${pool.id}-match-${matchIndex + 1}`,
        participant1: entry1.participant,
        participant2: entry2.participant,
        score: null,
        status: MATCH_STATUSES.SCHEDULED,
        winnerId: null,
        courtNumber: null,
        round: 0,
        position: matchIndex,
        scheduledTime: null,
        startedAt: null,
        endedAt: null,
      });
      matchIndex++;
    }
  }

  return matches;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    const swapItem = shuffled[j];
    if (temp !== undefined && swapItem !== undefined) {
      shuffled[i] = swapItem;
      shuffled[j] = temp;
    }
  }
  return shuffled;
}

function findParticipantInPools(
  pools: Pool[],
  participantId: string,
): Participant | null {
  for (const pool of pools) {
    const entry = pool.entries.find(
      (e) => e.participant.id === participantId,
    );
    if (entry) return entry.participant;
  }
  return null;
}
