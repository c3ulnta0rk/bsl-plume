import { describe, expect, it } from "vitest";
import { calculateMatchResult, validateScore } from "./scoring";
import type { Score } from "./types";

describe("validateScore", () => {
  describe("valid scores", () => {
    it("should accept a standard 2-0 win (21-15, 21-18)", () => {
      const score: Score = {
        sets: [
          { score1: 21, score2: 15 },
          { score1: 21, score2: 18 },
        ],
      };
      expect(validateScore(score)).toEqual({ valid: true, errors: [] });
    });

    it("should accept a 2-1 win (21-15, 18-21, 21-12)", () => {
      const score: Score = {
        sets: [
          { score1: 21, score2: 15 },
          { score1: 18, score2: 21 },
          { score1: 21, score2: 12 },
        ],
      };
      expect(validateScore(score)).toEqual({ valid: true, errors: [] });
    });

    it("should accept a deuce win at 22-20", () => {
      const score: Score = {
        sets: [
          { score1: 22, score2: 20 },
          { score1: 21, score2: 10 },
        ],
      };
      expect(validateScore(score)).toEqual({ valid: true, errors: [] });
    });

    it("should accept a deuce win at 25-23", () => {
      const score: Score = {
        sets: [
          { score1: 25, score2: 23 },
          { score1: 21, score2: 19 },
        ],
      };
      expect(validateScore(score)).toEqual({ valid: true, errors: [] });
    });

    it("should accept maximum score 30-29", () => {
      const score: Score = {
        sets: [
          { score1: 30, score2: 29 },
          { score1: 21, score2: 5 },
        ],
      };
      expect(validateScore(score)).toEqual({ valid: true, errors: [] });
    });

    it("should accept 21-0 shutout", () => {
      const score: Score = {
        sets: [
          { score1: 21, score2: 0 },
          { score1: 21, score2: 0 },
        ],
      };
      expect(validateScore(score)).toEqual({ valid: true, errors: [] });
    });

    it("should accept player 2 winning", () => {
      const score: Score = {
        sets: [
          { score1: 15, score2: 21 },
          { score1: 18, score2: 21 },
        ],
      };
      expect(validateScore(score)).toEqual({ valid: true, errors: [] });
    });
  });

  describe("invalid scores", () => {
    it("should reject empty sets", () => {
      const score: Score = { sets: [] };
      const result = validateScore(score);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Score must have at least 1 set");
    });

    it("should reject more than 3 sets", () => {
      const score: Score = {
        sets: [
          { score1: 21, score2: 15 },
          { score1: 15, score2: 21 },
          { score1: 21, score2: 15 },
          { score1: 21, score2: 15 },
        ],
      };
      const result = validateScore(score);
      expect(result.valid).toBe(false);
    });

    it("should reject negative scores", () => {
      const score: Score = {
        sets: [
          { score1: -1, score2: 21 },
          { score1: 21, score2: 15 },
        ],
      };
      const result = validateScore(score);
      expect(result.valid).toBe(false);
    });

    it("should reject scores above 30", () => {
      const score: Score = {
        sets: [
          { score1: 31, score2: 29 },
          { score1: 21, score2: 15 },
        ],
      };
      const result = validateScore(score);
      expect(result.valid).toBe(false);
    });

    it("should reject non-winning score like 20-18", () => {
      const score: Score = {
        sets: [
          { score1: 20, score2: 18 },
          { score1: 21, score2: 15 },
        ],
      };
      const result = validateScore(score);
      expect(result.valid).toBe(false);
    });

    it("should reject deuce without 2-point lead (21-20)", () => {
      const score: Score = {
        sets: [
          { score1: 21, score2: 20 },
          { score1: 21, score2: 15 },
        ],
      };
      const result = validateScore(score);
      expect(result.valid).toBe(false);
    });

    it("should reject deuce with 3-point lead (24-21)", () => {
      const score: Score = {
        sets: [
          { score1: 24, score2: 21 },
          { score1: 21, score2: 15 },
        ],
      };
      const result = validateScore(score);
      expect(result.valid).toBe(false);
    });

    it("should reject 30-28 (max is 30-29)", () => {
      const score: Score = {
        sets: [
          { score1: 30, score2: 28 },
          { score1: 21, score2: 15 },
        ],
      };
      const result = validateScore(score);
      expect(result.valid).toBe(false);
    });

    it("should reject a third set when someone already won 2-0", () => {
      const score: Score = {
        sets: [
          { score1: 21, score2: 15 },
          { score1: 21, score2: 18 },
          { score1: 21, score2: 12 },
        ],
      };
      const result = validateScore(score);
      expect(result.valid).toBe(false);
    });
  });
});

describe("calculateMatchResult", () => {
  it("should return winner for a valid 2-0 score", () => {
    const score: Score = {
      sets: [
        { score1: 21, score2: 15 },
        { score1: 21, score2: 18 },
      ],
    };
    const result = calculateMatchResult("player1", "player2", score);
    expect(result).toEqual({
      success: true,
      winnerId: "player1",
      score,
    });
  });

  it("should return player 2 as winner when player 2 wins", () => {
    const score: Score = {
      sets: [
        { score1: 15, score2: 21 },
        { score1: 18, score2: 21 },
      ],
    };
    const result = calculateMatchResult("player1", "player2", score);
    expect(result).toEqual({
      success: true,
      winnerId: "player2",
      score,
    });
  });

  it("should return player 1 as winner in a 2-1 match", () => {
    const score: Score = {
      sets: [
        { score1: 21, score2: 15 },
        { score1: 18, score2: 21 },
        { score1: 21, score2: 19 },
      ],
    };
    const result = calculateMatchResult("player1", "player2", score);
    expect(result).toEqual({
      success: true,
      winnerId: "player1",
      score,
    });
  });

  it("should return error for invalid score", () => {
    const score: Score = {
      sets: [{ score1: 15, score2: 10 }],
    };
    const result = calculateMatchResult("player1", "player2", score);
    expect(result).toEqual({
      success: false,
      error: "INVALID_SCORE",
    });
  });

  it("should return error for incomplete match (1 set only, no winner)", () => {
    const score: Score = {
      sets: [{ score1: 21, score2: 15 }],
    };
    const result = calculateMatchResult("player1", "player2", score);
    expect(result).toEqual({
      success: false,
      error: "INVALID_SCORE",
    });
  });
});
