import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/session", () => ({
  requireSession: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@bsl-plume/db/queries", () => ({
  getClubMembership: vi.fn(),
  createTournament: vi.fn(),
  updateTournamentStatus: vi.fn(),
  createCategories: vi.fn(),
}));

import {
  createTournamentAction,
  updateTournamentStatusAction,
} from "./tournament";
import { requireSession } from "@/lib/session";
import {
  getClubMembership,
  createTournament,
  createCategories,
  updateTournamentStatus,
} from "@bsl-plume/db/queries";

const mockUser = {
  id: "u1",
  email: "admin@test.com",
  user_metadata: { name: "Admin" },
};

const validFormData = {
  name: "Open de Rimouski 2026",
  description: null,
  location: "Centre sportif",
  startDate: "2026-04-15",
  endDate: "2026-04-16",
  registrationStart: "2026-03-01",
  registrationEnd: "2026-04-10",
  courtCount: 6,
  categories: [{ type: "SH", maxPlayers: 32 }],
};

describe("createTournamentAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create tournament when admin", async () => {
    vi.mocked(requireSession).mockResolvedValue(mockUser as never);
    vi.mocked(getClubMembership).mockResolvedValue({
      id: "m1",
      userId: "u1",
      clubId: "c1",
      role: "admin",
      joinedAt: new Date(),
    });
    vi.mocked(createTournament).mockResolvedValue([
      { id: "t1", clubId: "c1", name: "Open", status: "draft" } as never,
    ]);
    vi.mocked(createCategories).mockResolvedValue([]);

    const result = await createTournamentAction("c1", "slug", validFormData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("t1");
    }
    expect(createCategories).toHaveBeenCalledOnce();
  });

  it("should reject when user is not admin", async () => {
    vi.mocked(requireSession).mockResolvedValue(mockUser as never);
    vi.mocked(getClubMembership).mockResolvedValue({
      id: "m1",
      userId: "u1",
      clubId: "c1",
      role: "player",
      joinedAt: new Date(),
    });

    const result = await createTournamentAction("c1", "slug", validFormData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Unauthorized");
    }
  });

  it("should reject when no membership exists", async () => {
    vi.mocked(requireSession).mockResolvedValue(mockUser as never);
    vi.mocked(getClubMembership).mockResolvedValue(undefined);

    const result = await createTournamentAction("c1", "slug", validFormData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Unauthorized");
    }
  });

  it("should reject when endDate <= startDate", async () => {
    vi.mocked(requireSession).mockResolvedValue(mockUser as never);
    vi.mocked(getClubMembership).mockResolvedValue({
      id: "m1",
      userId: "u1",
      clubId: "c1",
      role: "admin",
      joinedAt: new Date(),
    });

    const result = await createTournamentAction("c1", "slug", {
      ...validFormData,
      startDate: "2026-04-16",
      endDate: "2026-04-15",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("End date");
    }
  });

  it("should reject when registrationEnd > startDate", async () => {
    vi.mocked(requireSession).mockResolvedValue(mockUser as never);
    vi.mocked(getClubMembership).mockResolvedValue({
      id: "m1",
      userId: "u1",
      clubId: "c1",
      role: "admin",
      joinedAt: new Date(),
    });

    const result = await createTournamentAction("c1", "slug", {
      ...validFormData,
      registrationEnd: "2026-04-16",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Registration");
    }
  });

  it("should return error when DB insert fails", async () => {
    vi.mocked(requireSession).mockResolvedValue(mockUser as never);
    vi.mocked(getClubMembership).mockResolvedValue({
      id: "m1",
      userId: "u1",
      clubId: "c1",
      role: "admin",
      joinedAt: new Date(),
    });
    vi.mocked(createTournament).mockResolvedValue([undefined as never]);

    const result = await createTournamentAction("c1", "slug", validFormData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Failed");
    }
  });

  it("should skip category creation when no categories provided", async () => {
    vi.mocked(requireSession).mockResolvedValue(mockUser as never);
    vi.mocked(getClubMembership).mockResolvedValue({
      id: "m1",
      userId: "u1",
      clubId: "c1",
      role: "admin",
      joinedAt: new Date(),
    });
    vi.mocked(createTournament).mockResolvedValue([
      { id: "t1", clubId: "c1", name: "Open", status: "draft" } as never,
    ]);

    await createTournamentAction("c1", "slug", {
      ...validFormData,
      categories: [],
    });
    expect(createCategories).not.toHaveBeenCalled();
  });
});

describe("updateTournamentStatusAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update status when admin", async () => {
    vi.mocked(requireSession).mockResolvedValue(mockUser as never);
    vi.mocked(getClubMembership).mockResolvedValue({
      id: "m1",
      userId: "u1",
      clubId: "c1",
      role: "admin",
      joinedAt: new Date(),
    });
    vi.mocked(updateTournamentStatus).mockResolvedValue([
      { id: "t1", status: "registration_open" } as never,
    ]);

    const result = await updateTournamentStatusAction(
      "t1",
      "registration_open",
      "slug",
      "c1",
    );
    expect(result.success).toBe(true);
  });

  it("should reject when not admin", async () => {
    vi.mocked(requireSession).mockResolvedValue(mockUser as never);
    vi.mocked(getClubMembership).mockResolvedValue(undefined);

    const result = await updateTournamentStatusAction(
      "t1",
      "registration_open",
      "slug",
      "c1",
    );
    expect(result.success).toBe(false);
  });
});
