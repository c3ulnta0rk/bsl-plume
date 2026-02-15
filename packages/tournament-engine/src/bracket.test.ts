import { describe, expect, it } from "vitest";
import { generateBracket, progressWinner } from "./bracket";
import type { Participant, Score } from "./types";
import { MATCH_STATUSES } from "./types";

function createParticipants(count: number): Participant[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `player-${i + 1}`,
    seed: i + 1,
  }));
}

describe("generateBracket", () => {
  describe("bracket structure", () => {
    it("should create a bracket with 2 participants", () => {
      const bracket = generateBracket(createParticipants(2));
      expect(bracket.rounds).toBe(1);
      expect(bracket.matches).toHaveLength(1);
    });

    it("should create a bracket with 4 participants (2 rounds, 3 matches)", () => {
      const bracket = generateBracket(createParticipants(4));
      expect(bracket.rounds).toBe(2);
      expect(bracket.matches).toHaveLength(3);
    });

    it("should create a bracket with 8 participants (3 rounds, 7 matches)", () => {
      const bracket = generateBracket(createParticipants(8));
      expect(bracket.rounds).toBe(3);
      expect(bracket.matches).toHaveLength(7);
    });

    it("should create a bracket with 16 participants (4 rounds, 15 matches)", () => {
      const bracket = generateBracket(createParticipants(16));
      expect(bracket.rounds).toBe(4);
      expect(bracket.matches).toHaveLength(15);
    });
  });

  describe("non-power-of-2 participants", () => {
    it("should round up to 4 for 3 participants with 1 bye", () => {
      const bracket = generateBracket(createParticipants(3));
      expect(bracket.rounds).toBe(2);

      // One first-round match should be a walkover (bye)
      const firstRound = bracket.matches.filter((m) => m.round === 1);
      const walkovers = firstRound.filter(
        (m) => m.status === MATCH_STATUSES.WALKOVER,
      );
      expect(walkovers).toHaveLength(1);
    });

    it("should round up to 8 for 5 participants with 3 byes", () => {
      const bracket = generateBracket(createParticipants(5));
      expect(bracket.rounds).toBe(3);

      const firstRound = bracket.matches.filter((m) => m.round === 1);
      const walkovers = firstRound.filter(
        (m) => m.status === MATCH_STATUSES.WALKOVER,
      );
      expect(walkovers).toHaveLength(3);
    });

    it("should round up to 8 for 6 participants with 2 byes", () => {
      const bracket = generateBracket(createParticipants(6));
      const firstRound = bracket.matches.filter((m) => m.round === 1);
      const walkovers = firstRound.filter(
        (m) => m.status === MATCH_STATUSES.WALKOVER,
      );
      expect(walkovers).toHaveLength(2);
    });
  });

  describe("seeding", () => {
    it("should place seed 1 and seed 2 on opposite sides of the bracket", () => {
      const bracket = generateBracket(createParticipants(4));
      const firstRound = bracket.matches.filter((m) => m.round === 1);

      // Seed 1 and 2 should not be in the same first-round match
      for (const match of firstRound) {
        const seeds = [
          match.participant1?.seed,
          match.participant2?.seed,
        ].filter(Boolean);
        expect(seeds).not.toEqual(expect.arrayContaining([1, 2]));
      }
    });

    it("should place all participants in the bracket", () => {
      const participants = createParticipants(8);
      const bracket = generateBracket(participants);
      const firstRound = bracket.matches.filter((m) => m.round === 1);
      const placedIds = new Set<string>();

      for (const match of firstRound) {
        if (match.participant1) placedIds.add(match.participant1.id);
        if (match.participant2) placedIds.add(match.participant2.id);
      }

      expect(placedIds.size).toBe(8);
    });
  });

  describe("match linking", () => {
    it("should link first-round matches to second-round matches", () => {
      const bracket = generateBracket(createParticipants(4));
      const firstRound = bracket.matches.filter((m) => m.round === 1);
      const secondRound = bracket.matches.filter((m) => m.round === 2);

      expect(secondRound).toHaveLength(1);
      for (const match of firstRound) {
        expect(match.nextMatchId).toBe(secondRound[0]?.id);
      }
    });

    it("should have null nextMatchId for the final match", () => {
      const bracket = generateBracket(createParticipants(8));
      const finalMatch = bracket.matches.find(
        (m) => m.round === bracket.rounds,
      );
      expect(finalMatch?.nextMatchId).toBeNull();
    });
  });

  describe("bye advancement", () => {
    it("should auto-advance bye winners to the next round", () => {
      const bracket = generateBracket(createParticipants(3));
      const secondRound = bracket.matches.filter((m) => m.round === 2);

      // The bye winner should already be placed in round 2
      const hasParticipant = secondRound.some(
        (m) => m.participant1 !== null || m.participant2 !== null,
      );
      expect(hasParticipant).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should throw when fewer than 2 participants", () => {
      expect(() => generateBracket(createParticipants(1))).toThrow(
        "At least 2 participants are required",
      );
    });

    it("should accept custom bracket ID", () => {
      const bracket = generateBracket(
        createParticipants(4),
        "custom-bracket",
      );
      expect(bracket.id).toBe("custom-bracket");
      expect(bracket.matches[0]?.id).toContain("custom-bracket");
    });
  });
});

describe("progressWinner", () => {
  it("should mark the match as completed", () => {
    const bracket = generateBracket(createParticipants(4));
    const firstRound = bracket.matches.filter((m) => m.round === 1);
    const match = firstRound[0];
    if (!match?.participant1) return;

    const score: Score = {
      sets: [
        { score1: 21, score2: 15 },
        { score1: 21, score2: 18 },
      ],
    };

    progressWinner(bracket, match.id, match.participant1.id, score);
    expect(match.status).toBe(MATCH_STATUSES.COMPLETED);
  });

  it("should set the correct winner", () => {
    const bracket = generateBracket(createParticipants(4));
    const match = bracket.matches.find((m) => m.round === 1);
    if (!match?.participant1) return;

    const score: Score = {
      sets: [
        { score1: 21, score2: 15 },
        { score1: 21, score2: 18 },
      ],
    };

    progressWinner(bracket, match.id, match.participant1.id, score);
    expect(match.winnerId).toBe(match.participant1.id);
  });

  it("should advance winner to the next match", () => {
    const bracket = generateBracket(createParticipants(4));
    const match = bracket.matches.find((m) => m.round === 1);
    if (!match?.participant1 || !match.nextMatchId) return;

    const score: Score = {
      sets: [
        { score1: 21, score2: 15 },
        { score1: 21, score2: 18 },
      ],
    };

    progressWinner(bracket, match.id, match.participant1.id, score);

    const nextMatch = bracket.matches.find(
      (m) => m.id === match.nextMatchId,
    );
    const hasWinner =
      nextMatch?.participant1?.id === match.participant1.id ||
      nextMatch?.participant2?.id === match.participant1.id;
    expect(hasWinner).toBe(true);
  });

  it("should throw when match is not found", () => {
    const bracket = generateBracket(createParticipants(4));
    const score: Score = {
      sets: [
        { score1: 21, score2: 15 },
        { score1: 21, score2: 18 },
      ],
    };

    expect(() =>
      progressWinner(bracket, "nonexistent", "player-1", score),
    ).toThrow("Match nonexistent not found");
  });

  it("should throw when match is already completed", () => {
    const bracket = generateBracket(createParticipants(4));
    const match = bracket.matches.find((m) => m.round === 1);
    if (!match?.participant1) return;

    const score: Score = {
      sets: [
        { score1: 21, score2: 15 },
        { score1: 21, score2: 18 },
      ],
    };

    progressWinner(bracket, match.id, match.participant1.id, score);

    expect(() =>
      progressWinner(bracket, match.id, match.participant1?.id ?? "", score),
    ).toThrow("already completed");
  });

  it("should throw when winner is not a participant", () => {
    const bracket = generateBracket(createParticipants(4));
    const match = bracket.matches.find((m) => m.round === 1);
    if (!match) return;

    const score: Score = {
      sets: [
        { score1: 21, score2: 15 },
        { score1: 21, score2: 18 },
      ],
    };

    expect(() =>
      progressWinner(bracket, match.id, "unknown-player", score),
    ).toThrow("not a participant");
  });
});
