import { describe, expect, it } from "vitest";
import { assignCourt, releaseCourt, suggestCourt } from "./court";
import type { Court, Match } from "./types";
import { COURT_STATUSES, MATCH_STATUSES } from "./types";

function createCourt(overrides?: Partial<Court>): Court {
  return {
    id: "court-1",
    number: 1,
    name: "Court 1",
    status: COURT_STATUSES.AVAILABLE,
    currentMatchId: null,
    ...overrides,
  };
}

function createMatch(overrides?: Partial<Match>): Match {
  return {
    id: "match-1",
    participant1: { id: "player-1" },
    participant2: { id: "player-2" },
    score: null,
    status: MATCH_STATUSES.SCHEDULED,
    winnerId: null,
    courtNumber: null,
    round: 1,
    position: 0,
    scheduledTime: null,
    startedAt: null,
    endedAt: null,
    ...overrides,
  };
}

describe("suggestCourt", () => {
  it("should return the first available court", () => {
    const courts = [
      createCourt({ id: "court-1", number: 1 }),
      createCourt({ id: "court-2", number: 2 }),
      createCourt({ id: "court-3", number: 3 }),
    ];
    const suggested = suggestCourt(courts);
    expect(suggested?.number).toBe(1);
  });

  it("should skip courts that are in use", () => {
    const courts = [
      createCourt({
        id: "court-1",
        number: 1,
        status: COURT_STATUSES.IN_USE,
      }),
      createCourt({ id: "court-2", number: 2 }),
      createCourt({ id: "court-3", number: 3 }),
    ];
    const suggested = suggestCourt(courts);
    expect(suggested?.number).toBe(2);
  });

  it("should skip closed courts", () => {
    const courts = [
      createCourt({
        id: "court-1",
        number: 1,
        status: COURT_STATUSES.CLOSED,
      }),
      createCourt({
        id: "court-2",
        number: 2,
        status: COURT_STATUSES.CLOSED,
      }),
      createCourt({ id: "court-3", number: 3 }),
    ];
    const suggested = suggestCourt(courts);
    expect(suggested?.number).toBe(3);
  });

  it("should return null when no courts are available", () => {
    const courts = [
      createCourt({
        id: "court-1",
        number: 1,
        status: COURT_STATUSES.IN_USE,
      }),
      createCourt({
        id: "court-2",
        number: 2,
        status: COURT_STATUSES.CLOSED,
      }),
    ];
    const suggested = suggestCourt(courts);
    expect(suggested).toBeNull();
  });

  it("should return null for empty courts array", () => {
    const suggested = suggestCourt([]);
    expect(suggested).toBeNull();
  });

  it("should prefer lower-numbered courts", () => {
    const courts = [
      createCourt({
        id: "court-3",
        number: 3,
        status: COURT_STATUSES.IN_USE,
      }),
      createCourt({ id: "court-5", number: 5 }),
      createCourt({ id: "court-2", number: 2 }),
    ];
    const suggested = suggestCourt(courts);
    expect(suggested?.number).toBe(2);
  });
});

describe("assignCourt", () => {
  it("should set court status to in_use", () => {
    const court = createCourt();
    const match = createMatch();
    const result = assignCourt(court, match);
    expect(result.court.status).toBe(COURT_STATUSES.IN_USE);
  });

  it("should set currentMatchId on the court", () => {
    const court = createCourt();
    const match = createMatch({ id: "match-42" });
    const result = assignCourt(court, match);
    expect(result.court.currentMatchId).toBe("match-42");
  });

  it("should set courtNumber on the match", () => {
    const court = createCourt({ number: 3 });
    const match = createMatch();
    const result = assignCourt(court, match);
    expect(result.match.courtNumber).toBe(3);
  });

  it("should not mutate the original objects", () => {
    const court = createCourt();
    const match = createMatch();
    assignCourt(court, match);
    expect(court.status).toBe(COURT_STATUSES.AVAILABLE);
    expect(match.courtNumber).toBeNull();
  });
});

describe("releaseCourt", () => {
  it("should set court status to available", () => {
    const court = createCourt({
      status: COURT_STATUSES.IN_USE,
      currentMatchId: "match-1",
    });
    const released = releaseCourt(court);
    expect(released.status).toBe(COURT_STATUSES.AVAILABLE);
  });

  it("should clear currentMatchId", () => {
    const court = createCourt({
      status: COURT_STATUSES.IN_USE,
      currentMatchId: "match-1",
    });
    const released = releaseCourt(court);
    expect(released.currentMatchId).toBeNull();
  });

  it("should not mutate the original object", () => {
    const court = createCourt({
      status: COURT_STATUSES.IN_USE,
      currentMatchId: "match-1",
    });
    releaseCourt(court);
    expect(court.status).toBe(COURT_STATUSES.IN_USE);
    expect(court.currentMatchId).toBe("match-1");
  });
});
