import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/session", () => ({
  requireSession: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@bsl-plume/db/queries", () => ({
  getMatchById: vi.fn(),
  updateMatchScore: vi.fn(),
  updateMatchStatus: vi.fn(),
  assignMatchCourt: vi.fn(),
  assignCourtToMatch: vi.fn(),
  releaseCourt: vi.fn(),
  getAvailableCourts: vi.fn(),
}));
vi.mock("@bsl-plume/tournament-engine", () => ({
  validateScore: vi.fn(),
  calculateMatchResult: vi.fn(),
}));

import {
  submitScoreAction,
  assignCourtAction,
  releaseCourtAction,
  updateMatchStatusAction,
} from "./scoring";
import { requireSession } from "@/lib/session";
import {
  getMatchById,
  updateMatchScore,
  updateMatchStatus,
  getAvailableCourts,
  assignCourtToMatch,
  assignMatchCourt,
  releaseCourt,
} from "@bsl-plume/db/queries";
import {
  validateScore,
  calculateMatchResult,
} from "@bsl-plume/tournament-engine";

const mockUser = {
  id: "u1",
  email: "admin@test.com",
  user_metadata: { name: "Admin" },
};

const mockMatch = {
  id: "m1",
  participant1Id: "p1",
  participant2Id: "p2",
  status: "in_progress",
};

const validSets = [
  { score1: 21, score2: 15 },
  { score1: 21, score2: 18 },
];

describe("submitScoreAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should submit score successfully", async () => {
    vi.mocked(requireSession).mockResolvedValue(mockUser as never);
    vi.mocked(getMatchById).mockResolvedValue(mockMatch as never);
    vi.mocked(validateScore).mockReturnValue({ valid: true, errors: [] });
    vi.mocked(calculateMatchResult).mockReturnValue({
      success: true,
      winnerId: "p1",
    } as never);
    vi.mocked(updateMatchScore).mockResolvedValue([{ id: "m1" } as never]);

    const result = await submitScoreAction("m1", validSets, "slug");
    expect(result.success).toBe(true);
    expect(updateMatchScore).toHaveBeenCalledOnce();
  });

  it("should reject when match not found", async () => {
    vi.mocked(requireSession).mockResolvedValue(mockUser as never);
    vi.mocked(getMatchById).mockResolvedValue(undefined);

    const result = await submitScoreAction("m1", validSets, "slug");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Match not found");
    }
  });

  it("should reject when participants not set", async () => {
    vi.mocked(requireSession).mockResolvedValue(mockUser as never);
    vi.mocked(getMatchById).mockResolvedValue({
      ...mockMatch,
      participant1Id: null,
      participant2Id: null,
    } as never);

    const result = await submitScoreAction("m1", validSets, "slug");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("participants");
    }
  });

  it("should reject when score is invalid", async () => {
    vi.mocked(requireSession).mockResolvedValue(mockUser as never);
    vi.mocked(getMatchById).mockResolvedValue(mockMatch as never);
    vi.mocked(validateScore).mockReturnValue({
      valid: false,
      errors: ["Score must be between 0 and 30"],
    });

    const result = await submitScoreAction("m1", validSets, "slug");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Score");
    }
  });

  it("should reject when result calculation fails", async () => {
    vi.mocked(requireSession).mockResolvedValue(mockUser as never);
    vi.mocked(getMatchById).mockResolvedValue(mockMatch as never);
    vi.mocked(validateScore).mockReturnValue({ valid: true, errors: [] });
    vi.mocked(calculateMatchResult).mockReturnValue({
      success: false,
      error: "No winner determined",
    } as never);

    const result = await submitScoreAction("m1", validSets, "slug");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("No winner");
    }
  });
});

describe("assignCourtAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should assign court successfully", async () => {
    vi.mocked(requireSession).mockResolvedValue(mockUser as never);
    vi.mocked(getAvailableCourts).mockResolvedValue([
      { id: "c1", number: 3, name: "Court 3", status: "available" } as never,
    ]);
    vi.mocked(assignCourtToMatch).mockResolvedValue([
      { id: "c1", status: "in_use" } as never,
    ]);
    vi.mocked(assignMatchCourt).mockResolvedValue([
      { id: "m1", courtNumber: 3 } as never,
    ]);

    const result = await assignCourtAction("m1", "t1", "slug");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.courtNumber).toBe(3);
    }
  });

  it("should reject when no courts available", async () => {
    vi.mocked(requireSession).mockResolvedValue(mockUser as never);
    vi.mocked(getAvailableCourts).mockResolvedValue([]);

    const result = await assignCourtAction("m1", "t1", "slug");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("No courts available");
    }
  });
});

describe("releaseCourtAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should release court successfully", async () => {
    vi.mocked(requireSession).mockResolvedValue(mockUser as never);
    vi.mocked(releaseCourt).mockResolvedValue([
      { id: "c1", status: "available" } as never,
    ]);

    const result = await releaseCourtAction("c1", "slug");
    expect(result.success).toBe(true);
  });
});

describe("updateMatchStatusAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update match status successfully", async () => {
    vi.mocked(requireSession).mockResolvedValue(mockUser as never);
    vi.mocked(updateMatchStatus).mockResolvedValue([
      { id: "m1", status: "completed" } as never,
    ]);

    const result = await updateMatchStatusAction("m1", "completed", "slug");
    expect(result.success).toBe(true);
  });
});
