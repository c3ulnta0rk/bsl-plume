import type { Court, Match } from "./types";
import { COURT_STATUSES } from "./types";

/**
 * Suggest the best available court for a match.
 * Returns null if no courts are available.
 */
export function suggestCourt(courts: Court[]): Court | null {
  const available = courts.filter(
    (c) => c.status === COURT_STATUSES.AVAILABLE,
  );

  if (available.length === 0) return null;

  // Prefer courts by number order (lower first)
  available.sort((a, b) => a.number - b.number);

  return available[0] ?? null;
}

/**
 * Assign a court to a match, updating the court status.
 */
export function assignCourt(
  court: Court,
  match: Match,
): { court: Court; match: Match } {
  return {
    court: {
      ...court,
      status: COURT_STATUSES.IN_USE,
      currentMatchId: match.id,
    },
    match: {
      ...match,
      courtNumber: court.number,
    },
  };
}

/**
 * Release a court after a match is completed.
 */
export function releaseCourt(court: Court): Court {
  return {
    ...court,
    status: COURT_STATUSES.AVAILABLE,
    currentMatchId: null,
  };
}
