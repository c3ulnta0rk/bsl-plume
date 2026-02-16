/**
 * BWF-compliant badminton score generator for seed data.
 * Rules: best of 3 sets, 21 points to win, must win by 2, cap at 30-29.
 * ~70% of matches end in 2-0, ~30% in 2-1.
 */

interface SetScore {
  winner: number;
  loser: number;
}

interface MatchScore {
  scoreSet1P1: number;
  scoreSet1P2: number;
  scoreSet2P1: number;
  scoreSet2P2: number;
  scoreSet3P1: number | null;
  scoreSet3P2: number | null;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateSetScore(winnerFirst: boolean): SetScore {
  const loserScore = randomInt(10, 19);
  const winnerScore = 21;
  return winnerFirst
    ? { winner: winnerScore, loser: loserScore }
    : { winner: winnerScore, loser: loserScore };
}

function generateDeuceSetScore(): SetScore {
  // Deuce scenarios: 22-20 to 30-28, or 30-29 (cap)
  const isCap = Math.random() < 0.15;
  if (isCap) {
    return { winner: 30, loser: 29 };
  }
  const winnerScore = randomInt(22, 30);
  return { winner: winnerScore, loser: winnerScore - 2 };
}

function generateSingleSet(): SetScore {
  const isDeuce = Math.random() < 0.2;
  return isDeuce ? generateDeuceSetScore() : generateSetScore(true);
}

/**
 * Generate a realistic BWF-compliant badminton match score.
 * @param winnerSide 1 = participant1 wins, 2 = participant2 wins
 */
export function generateScore(winnerSide: 1 | 2): MatchScore {
  const isStraight = Math.random() < 0.7; // 70% chance of 2-0

  if (isStraight) {
    // Winner takes sets 1 and 2
    const set1 = generateSingleSet();
    const set2 = generateSingleSet();

    if (winnerSide === 1) {
      return {
        scoreSet1P1: set1.winner,
        scoreSet1P2: set1.loser,
        scoreSet2P1: set2.winner,
        scoreSet2P2: set2.loser,
        scoreSet3P1: null,
        scoreSet3P2: null,
      };
    }
    return {
      scoreSet1P1: set1.loser,
      scoreSet1P2: set1.winner,
      scoreSet2P1: set2.loser,
      scoreSet2P2: set2.winner,
      scoreSet3P1: null,
      scoreSet3P2: null,
    };
  }

  // 2-1: winner loses one set, wins the other two
  const winSet1 = generateSingleSet();
  const loseSet = generateSingleSet();
  const winSet2 = generateSingleSet();

  // Decide which set the winner loses (set 1 or set 2)
  const losesFirstSet = Math.random() < 0.5;

  if (winnerSide === 1) {
    if (losesFirstSet) {
      return {
        scoreSet1P1: loseSet.loser,
        scoreSet1P2: loseSet.winner,
        scoreSet2P1: winSet1.winner,
        scoreSet2P2: winSet1.loser,
        scoreSet3P1: winSet2.winner,
        scoreSet3P2: winSet2.loser,
      };
    }
    return {
      scoreSet1P1: winSet1.winner,
      scoreSet1P2: winSet1.loser,
      scoreSet2P1: loseSet.loser,
      scoreSet2P2: loseSet.winner,
      scoreSet3P1: winSet2.winner,
      scoreSet3P2: winSet2.loser,
    };
  }

  // winnerSide === 2
  if (losesFirstSet) {
    return {
      scoreSet1P1: loseSet.winner,
      scoreSet1P2: loseSet.loser,
      scoreSet2P1: winSet1.loser,
      scoreSet2P2: winSet1.winner,
      scoreSet3P1: winSet2.loser,
      scoreSet3P2: winSet2.winner,
    };
  }
  return {
    scoreSet1P1: winSet1.loser,
    scoreSet1P2: winSet1.winner,
    scoreSet2P1: loseSet.winner,
    scoreSet2P2: loseSet.loser,
    scoreSet3P1: winSet2.loser,
    scoreSet3P2: winSet2.winner,
  };
}

/**
 * Calculate total points scored by each participant across all sets.
 */
export function totalPoints(score: MatchScore): { p1: number; p2: number } {
  let p1 = score.scoreSet1P1 + score.scoreSet2P1;
  let p2 = score.scoreSet1P2 + score.scoreSet2P2;
  if (score.scoreSet3P1 !== null && score.scoreSet3P2 !== null) {
    p1 += score.scoreSet3P1;
    p2 += score.scoreSet3P2;
  }
  return { p1, p2 };
}
