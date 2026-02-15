import { describe, expect, it } from "vitest";
import { matchScoreSchema } from "./match.schema";

describe("matchScoreSchema", () => {
  it("should validate a standard 2-0 score", () => {
    const result = matchScoreSchema.safeParse({
      sets: [
        { score1: 21, score2: 15 },
        { score1: 21, score2: 18 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("should validate a 2-1 score", () => {
    const result = matchScoreSchema.safeParse({
      sets: [
        { score1: 21, score2: 15 },
        { score1: 18, score2: 21 },
        { score1: 21, score2: 19 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty sets", () => {
    const result = matchScoreSchema.safeParse({ sets: [] });
    expect(result.success).toBe(false);
  });

  it("should reject more than 3 sets", () => {
    const result = matchScoreSchema.safeParse({
      sets: [
        { score1: 21, score2: 15 },
        { score1: 21, score2: 18 },
        { score1: 21, score2: 12 },
        { score1: 21, score2: 10 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("should reject negative scores", () => {
    const result = matchScoreSchema.safeParse({
      sets: [{ score1: -1, score2: 21 }],
    });
    expect(result.success).toBe(false);
  });

  it("should reject scores above 30", () => {
    const result = matchScoreSchema.safeParse({
      sets: [{ score1: 31, score2: 21 }],
    });
    expect(result.success).toBe(false);
  });
});
