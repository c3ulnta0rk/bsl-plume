import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/session", () => ({
  requireSession: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@bsl-plume/db/queries", () => ({
  getClubMembership: vi.fn(),
  listRegistrationsByCategory: vi.fn(),
  listPoolsByCategory: vi.fn(),
  listPoolEntries: vi.fn(),
  createPools: vi.fn(),
  createPoolEntries: vi.fn(),
  createBracket: vi.fn(),
  createMatches: vi.fn(),
  getCategoryById: vi.fn(),
}));
vi.mock("@bsl-plume/tournament-engine", () => ({
  generatePools: vi.fn(),
  generateBracket: vi.fn(),
}));

import {
  generatePoolsAction,
  generateBracketAction,
} from "./pool-bracket";
import { requireSession } from "@/lib/session";
import {
  getClubMembership,
  listRegistrationsByCategory,
  listPoolsByCategory,
  listPoolEntries,
  createPools,
  createPoolEntries,
  createBracket,
  createMatches,
  getCategoryById,
} from "@bsl-plume/db/queries";
import {
  generatePools,
  generateBracket,
} from "@bsl-plume/tournament-engine";

const mockUser = {
  id: "u1",
  email: "admin@test.com",
  user_metadata: { name: "Admin" },
};

const adminMembership = {
  id: "m1",
  userId: "u1",
  clubId: "c1",
  role: "admin",
  joinedAt: new Date(),
};

describe("generatePoolsAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate pools successfully", async () => {
    vi.mocked(requireSession).mockResolvedValue(mockUser as never);
    vi.mocked(getClubMembership).mockResolvedValue(adminMembership);
    vi.mocked(listRegistrationsByCategory).mockResolvedValue([
      { playerId: "p1", status: "confirmed" },
      { playerId: "p2", status: "confirmed" },
      { playerId: "p3", status: "confirmed" },
      { playerId: "p4", status: "confirmed" },
    ] as never);
    vi.mocked(generatePools).mockReturnValue([
      {
        name: "A",
        entries: [{ participant: { id: "p1" } }, { participant: { id: "p2" } }],
        matches: [{ participant1: { id: "p1" }, participant2: { id: "p2" } }],
      },
      {
        name: "B",
        entries: [{ participant: { id: "p3" } }, { participant: { id: "p4" } }],
        matches: [{ participant1: { id: "p3" }, participant2: { id: "p4" } }],
      },
    ] as never);
    vi.mocked(createPools).mockResolvedValue([
      { id: "pool1", name: "A" },
      { id: "pool2", name: "B" },
    ] as never);
    vi.mocked(createPoolEntries).mockResolvedValue([] as never);
    vi.mocked(createMatches).mockResolvedValue([] as never);

    const result = await generatePoolsAction("cat1", 2, "slug", "c1");
    expect(result.success).toBe(true);
    expect(createPools).toHaveBeenCalledOnce();
  });

  it("should reject when not admin", async () => {
    vi.mocked(requireSession).mockResolvedValue(mockUser as never);
    vi.mocked(getClubMembership).mockResolvedValue(undefined);

    const result = await generatePoolsAction("cat1", 2, "slug", "c1");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Unauthorized");
    }
  });

  it("should reject when less than 3 confirmed registrations", async () => {
    vi.mocked(requireSession).mockResolvedValue(mockUser as never);
    vi.mocked(getClubMembership).mockResolvedValue(adminMembership);
    vi.mocked(listRegistrationsByCategory).mockResolvedValue([
      { playerId: "p1", status: "confirmed" },
      { playerId: "p2", status: "pending" },
    ] as never);

    const result = await generatePoolsAction("cat1", 2, "slug", "c1");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("at least 3");
    }
  });
});

describe("generateBracketAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate bracket successfully", async () => {
    vi.mocked(requireSession).mockResolvedValue(mockUser as never);
    vi.mocked(getClubMembership).mockResolvedValue(adminMembership);
    vi.mocked(listPoolsByCategory).mockResolvedValue([
      { id: "pool1", name: "A" },
    ] as never);
    vi.mocked(getCategoryById).mockResolvedValue({
      id: "cat1",
      type: "SH",
    } as never);
    vi.mocked(listPoolEntries).mockResolvedValue([
      { playerId: "p1", rank: 1, wins: 3, losses: 0 },
      { playerId: "p2", rank: 2, wins: 2, losses: 1 },
      { playerId: "p3", rank: 3, wins: 1, losses: 2 },
    ] as never);
    vi.mocked(generateBracket).mockReturnValue({
      rounds: 2,
      matches: [
        {
          round: 1,
          position: 0,
          participant1: { id: "p1" },
          participant2: { id: "p2" },
          status: "scheduled",
        },
      ],
    } as never);
    vi.mocked(createBracket).mockResolvedValue([
      { id: "b1", categoryId: "cat1" } as never,
    ]);
    vi.mocked(createMatches).mockResolvedValue([] as never);

    const result = await generateBracketAction("cat1", "slug", "c1");
    expect(result.success).toBe(true);
    expect(createBracket).toHaveBeenCalledOnce();
  });

  it("should reject when not admin", async () => {
    vi.mocked(requireSession).mockResolvedValue(mockUser as never);
    vi.mocked(getClubMembership).mockResolvedValue(undefined);

    const result = await generateBracketAction("cat1", "slug", "c1");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Unauthorized");
    }
  });

  it("should reject when no pools found", async () => {
    vi.mocked(requireSession).mockResolvedValue(mockUser as never);
    vi.mocked(getClubMembership).mockResolvedValue(adminMembership);
    vi.mocked(listPoolsByCategory).mockResolvedValue([]);

    const result = await generateBracketAction("cat1", "slug", "c1");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("No pools");
    }
  });

  it("should reject when category not found", async () => {
    vi.mocked(requireSession).mockResolvedValue(mockUser as never);
    vi.mocked(getClubMembership).mockResolvedValue(adminMembership);
    vi.mocked(listPoolsByCategory).mockResolvedValue([
      { id: "pool1" },
    ] as never);
    vi.mocked(getCategoryById).mockResolvedValue(undefined);

    const result = await generateBracketAction("cat1", "slug", "c1");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Category not found");
    }
  });

  it("should reject when not enough qualified players", async () => {
    vi.mocked(requireSession).mockResolvedValue(mockUser as never);
    vi.mocked(getClubMembership).mockResolvedValue(adminMembership);
    vi.mocked(listPoolsByCategory).mockResolvedValue([
      { id: "pool1" },
    ] as never);
    vi.mocked(getCategoryById).mockResolvedValue({
      id: "cat1",
      type: "SH",
    } as never);
    // Only 1 entry in pool, so only 1 qualified (need at least 2)
    vi.mocked(listPoolEntries).mockResolvedValue([
      { playerId: "p1", rank: 1, wins: 1, losses: 0 },
    ] as never);

    const result = await generateBracketAction("cat1", "slug", "c1");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Not enough qualified");
    }
  });
});
