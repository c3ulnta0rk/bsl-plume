import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/session", () => ({
  requireSession: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@bsl-plume/db/queries", () => ({
  getPlayerByUserId: vi.fn(),
  getCategoryById: vi.fn(),
  getTournamentById: vi.fn(),
  getRegistration: vi.fn(),
  createRegistration: vi.fn(),
  countRegistrationsByCategory: vi.fn(),
  deleteRegistration: vi.fn(),
}));

import {
  registerForCategoryAction,
  withdrawRegistrationAction,
} from "./registration";
import { requireSession } from "@/lib/session";
import {
  getPlayerByUserId,
  getCategoryById,
  getTournamentById,
  getRegistration,
  createRegistration,
  countRegistrationsByCategory,
  deleteRegistration,
} from "@bsl-plume/db/queries";

const mockUser = {
  id: "u1",
  email: "player@test.com",
  user_metadata: { name: "Player" },
};

const mockPlayer = { id: "p1", userId: "u1", firstName: "Jean", lastName: "T" };
const mockCategory = {
  id: "cat1",
  tournamentId: "t1",
  type: "SH",
  maxPlayers: 32,
  status: "open",
};
const mockTournament = {
  id: "t1",
  status: "registration_open",
  name: "Test",
};

describe("registerForCategoryAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should register successfully", async () => {
    vi.mocked(requireSession).mockResolvedValue(mockUser as never);
    vi.mocked(getPlayerByUserId).mockResolvedValue(mockPlayer as never);
    vi.mocked(getCategoryById).mockResolvedValue(mockCategory as never);
    vi.mocked(getTournamentById).mockResolvedValue(mockTournament as never);
    vi.mocked(getRegistration).mockResolvedValue(undefined);
    vi.mocked(countRegistrationsByCategory).mockResolvedValue([
      { count: 5 },
    ]);
    vi.mocked(createRegistration).mockResolvedValue([
      { id: "r1", playerId: "p1", categoryId: "cat1", status: "confirmed" } as never,
    ]);

    const result = await registerForCategoryAction("cat1", "slug");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("r1");
    }
  });

  it("should reject when player not found", async () => {
    vi.mocked(requireSession).mockResolvedValue(mockUser as never);
    vi.mocked(getPlayerByUserId).mockResolvedValue(undefined);

    const result = await registerForCategoryAction("cat1", "slug");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Player profile not found");
    }
  });

  it("should reject when category not found", async () => {
    vi.mocked(requireSession).mockResolvedValue(mockUser as never);
    vi.mocked(getPlayerByUserId).mockResolvedValue(mockPlayer as never);
    vi.mocked(getCategoryById).mockResolvedValue(undefined);

    const result = await registerForCategoryAction("cat1", "slug");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Category not found");
    }
  });

  it("should reject when tournament is not in registration_open status", async () => {
    vi.mocked(requireSession).mockResolvedValue(mockUser as never);
    vi.mocked(getPlayerByUserId).mockResolvedValue(mockPlayer as never);
    vi.mocked(getCategoryById).mockResolvedValue(mockCategory as never);
    vi.mocked(getTournamentById).mockResolvedValue({
      ...mockTournament,
      status: "draft",
    } as never);

    const result = await registerForCategoryAction("cat1", "slug");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("closed");
    }
  });

  it("should reject when already registered", async () => {
    vi.mocked(requireSession).mockResolvedValue(mockUser as never);
    vi.mocked(getPlayerByUserId).mockResolvedValue(mockPlayer as never);
    vi.mocked(getCategoryById).mockResolvedValue(mockCategory as never);
    vi.mocked(getTournamentById).mockResolvedValue(mockTournament as never);
    vi.mocked(getRegistration).mockResolvedValue({
      id: "existing",
    } as never);

    const result = await registerForCategoryAction("cat1", "slug");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Already registered");
    }
  });

  it("should reject when category is full", async () => {
    vi.mocked(requireSession).mockResolvedValue(mockUser as never);
    vi.mocked(getPlayerByUserId).mockResolvedValue(mockPlayer as never);
    vi.mocked(getCategoryById).mockResolvedValue(mockCategory as never);
    vi.mocked(getTournamentById).mockResolvedValue(mockTournament as never);
    vi.mocked(getRegistration).mockResolvedValue(undefined);
    vi.mocked(countRegistrationsByCategory).mockResolvedValue([
      { count: 32 },
    ]);

    const result = await registerForCategoryAction("cat1", "slug");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("full");
    }
  });
});

describe("withdrawRegistrationAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should withdraw successfully", async () => {
    vi.mocked(requireSession).mockResolvedValue(mockUser as never);
    vi.mocked(getPlayerByUserId).mockResolvedValue(mockPlayer as never);
    vi.mocked(deleteRegistration).mockResolvedValue([
      { id: "r1" } as never,
    ]);

    const result = await withdrawRegistrationAction("r1", "slug");
    expect(result.success).toBe(true);
  });

  it("should reject when player not found", async () => {
    vi.mocked(requireSession).mockResolvedValue(mockUser as never);
    vi.mocked(getPlayerByUserId).mockResolvedValue(undefined);

    const result = await withdrawRegistrationAction("r1", "slug");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Player profile not found");
    }
  });
});
