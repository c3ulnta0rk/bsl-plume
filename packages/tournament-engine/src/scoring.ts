import type { MatchResult, Score, Set } from "./types";

const MIN_WINNING_SCORE = 21;
const DEUCE_THRESHOLD = 20;
const MAX_SCORE = 30;
const SETS_TO_WIN = 2;
const MAX_SETS = 3;

/**
 * Validate a badminton score according to BWF rules.
 * - A set is won at 21 points (or at deuce, first to 30 or 2-point lead)
 * - Match is best of 3 sets (first to win 2)
 */
export function validateScore(score: Score): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (score.sets.length === 0) {
    errors.push("Score must have at least 1 set");
    return { valid: false, errors };
  }

  if (score.sets.length > MAX_SETS) {
    errors.push(`Score cannot have more than ${MAX_SETS} sets`);
    return { valid: false, errors };
  }

  let sets1Won = 0;
  let sets2Won = 0;
  let matchDecidedAtSet: number | null = null;

  for (let i = 0; i < score.sets.length; i++) {
    const set = score.sets[i];
    if (!set) continue;

    const setErrors = validateSet(set, i + 1);
    errors.push(...setErrors);

    if (setErrors.length === 0) {
      if (set.score1 > set.score2) sets1Won++;
      else sets2Won++;

      if (
        matchDecidedAtSet === null &&
        (sets1Won >= SETS_TO_WIN || sets2Won >= SETS_TO_WIN)
      ) {
        matchDecidedAtSet = i;
      }
    }
  }

  // If the match was decided before the last set, there are extra sets
  if (matchDecidedAtSet !== null && matchDecidedAtSet < score.sets.length - 1) {
    errors.push("Match should end when a player wins 2 sets");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Calculate the match result from a validated score.
 */
export function calculateMatchResult(
  participant1Id: string,
  participant2Id: string,
  score: Score,
): MatchResult {
  const validation = validateScore(score);
  if (!validation.valid) {
    return { success: false, error: "INVALID_SCORE" };
  }

  let sets1Won = 0;
  let sets2Won = 0;

  for (const set of score.sets) {
    if (set.score1 > set.score2) sets1Won++;
    else sets2Won++;
  }

  if (sets1Won < SETS_TO_WIN && sets2Won < SETS_TO_WIN) {
    return { success: false, error: "INVALID_SCORE" };
  }

  const winnerId = sets1Won >= SETS_TO_WIN ? participant1Id : participant2Id;
  return { success: true, winnerId, score };
}

function validateSet(set: Set, setNumber: number): string[] {
  const errors: string[] = [];
  const { score1, score2 } = set;

  if (!Number.isInteger(score1) || !Number.isInteger(score2)) {
    errors.push(`Set ${setNumber}: scores must be integers`);
    return errors;
  }

  if (score1 < 0 || score2 < 0) {
    errors.push(`Set ${setNumber}: scores cannot be negative`);
    return errors;
  }

  if (score1 > MAX_SCORE || score2 > MAX_SCORE) {
    errors.push(`Set ${setNumber}: score cannot exceed ${MAX_SCORE}`);
    return errors;
  }

  const higher = Math.max(score1, score2);
  const lower = Math.min(score1, score2);

  // Normal win: 21-X where X < 20
  if (higher === MIN_WINNING_SCORE && lower < DEUCE_THRESHOLD) {
    return errors;
  }

  // Deuce win: 2-point lead between 20-29
  if (
    higher >= MIN_WINNING_SCORE &&
    higher < MAX_SCORE &&
    lower >= DEUCE_THRESHOLD &&
    higher - lower === 2
  ) {
    return errors;
  }

  // Max score win: 30-29
  if (higher === MAX_SCORE && lower === MAX_SCORE - 1) {
    return errors;
  }

  errors.push(
    `Set ${setNumber}: invalid score ${score1}-${score2}. Must be won at 21 (or deuce rules up to 30-29)`,
  );

  return errors;
}
