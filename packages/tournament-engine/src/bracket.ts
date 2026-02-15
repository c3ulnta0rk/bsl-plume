import type { Bracket, BracketMatch, Participant, Score } from "./types";
import { MATCH_STATUSES } from "./types";

/**
 * Generate a single-elimination bracket from qualified participants.
 * Bracket size is rounded up to the nearest power of 2.
 * Byes are assigned to top seeds.
 */
export function generateBracket(
  participants: Participant[],
  bracketId?: string,
): Bracket {
  if (participants.length < 2) {
    throw new Error("At least 2 participants are required for a bracket");
  }

  const bracketSize = nextPowerOf2(participants.length);
  const rounds = Math.log2(bracketSize);
  const matches: BracketMatch[] = [];

  // Create all matches for the bracket structure
  for (let round = 1; round <= rounds; round++) {
    const matchesInRound = bracketSize / 2 ** round;
    for (let position = 0; position < matchesInRound; position++) {
      const matchId = `${bracketId ?? "bracket"}-r${round}-m${position + 1}`;
      const nextMatchId =
        round < rounds
          ? `${bracketId ?? "bracket"}-r${round + 1}-m${Math.floor(position / 2) + 1}`
          : null;

      matches.push({
        id: matchId,
        round,
        position,
        participant1: null,
        participant2: null,
        score: null,
        status: MATCH_STATUSES.SCHEDULED,
        winnerId: null,
        nextMatchId,
      });
    }
  }

  // Seed participants into first round using standard bracket seeding
  const seeding = generateBracketSeeding(bracketSize);
  const firstRoundMatches = matches.filter((m) => m.round === 1);

  for (let i = 0; i < seeding.length; i++) {
    const seedPosition = seeding[i];
    if (seedPosition === undefined) continue;

    const participant = participants[seedPosition];
    const matchIndex = Math.floor(i / 2);
    const match = firstRoundMatches[matchIndex];

    if (!match) continue;

    if (i % 2 === 0) {
      match.participant1 = participant ?? null;
    } else {
      match.participant2 = participant ?? null;
    }
  }

  // Handle byes: if one participant is null, auto-advance the other
  for (const match of firstRoundMatches) {
    if (match.participant1 && !match.participant2) {
      match.winnerId = match.participant1.id;
      match.status = MATCH_STATUSES.WALKOVER;
      advanceWinner(matches, match, match.participant1);
    } else if (!match.participant1 && match.participant2) {
      match.winnerId = match.participant2.id;
      match.status = MATCH_STATUSES.WALKOVER;
      advanceWinner(matches, match, match.participant2);
    }
  }

  return {
    id: bracketId ?? "bracket",
    rounds,
    matches,
  };
}

/**
 * Progress the winner of a completed match to the next round.
 */
export function progressWinner(
  bracket: Bracket,
  matchId: string,
  winnerId: string,
  score: Score,
): Bracket {
  const match = bracket.matches.find((m) => m.id === matchId);
  if (!match) {
    throw new Error(`Match ${matchId} not found in bracket`);
  }

  if (match.status === MATCH_STATUSES.COMPLETED) {
    throw new Error(`Match ${matchId} is already completed`);
  }

  const winner =
    match.participant1?.id === winnerId
      ? match.participant1
      : match.participant2?.id === winnerId
        ? match.participant2
        : null;

  if (!winner) {
    throw new Error(`Winner ${winnerId} is not a participant in match ${matchId}`);
  }

  match.winnerId = winnerId;
  match.score = score;
  match.status = MATCH_STATUSES.COMPLETED;

  advanceWinner(bracket.matches, match, winner);

  return bracket;
}

// --- Internal helpers ---

function nextPowerOf2(n: number): number {
  let power = 1;
  while (power < n) {
    power *= 2;
  }
  return power;
}

/**
 * Generate standard tournament bracket seeding.
 * Ensures top seeds are on opposite sides of the bracket.
 */
function generateBracketSeeding(size: number): number[] {
  if (size === 1) return [0];

  const half = generateBracketSeeding(size / 2);
  const result: number[] = [];

  for (const position of half) {
    result.push(position);
    result.push(size - 1 - position);
  }

  return result;
}

function advanceWinner(
  matches: BracketMatch[],
  currentMatch: BracketMatch,
  winner: Participant,
): void {
  if (!currentMatch.nextMatchId) return;

  const nextMatch = matches.find((m) => m.id === currentMatch.nextMatchId);
  if (!nextMatch) return;

  // Place winner in the correct slot of the next match
  if (currentMatch.position % 2 === 0) {
    nextMatch.participant1 = winner;
  } else {
    nextMatch.participant2 = winner;
  }
}
