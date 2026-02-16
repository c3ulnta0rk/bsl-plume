import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/session", () => ({
  requireSession: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@bsl-plume/db/queries", () => ({
  getPlayerByUserId: vi.fn(),
  upsertPlayer: vi.fn(),
}));

import {
  upsertPlayerProfileAction,
  getPlayerProfileAction,
} from "./player";
import { requireSession } from "@/lib/session";
import { getPlayerByUserId, upsertPlayer } from "@bsl-plume/db/queries";

const mockUser = {
  id: "u1",
  email: "player@test.com",
  user_metadata: { name: "Player" },
};

const validFormData = {
  firstName: "Jean",
  lastName: "Tremblay",
  birthDate: "1995-06-15",
  club: "BSL Badminton",
  licenseNumber: "QC-12345",
};

describe("upsertPlayerProfileAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should upsert player profile successfully", async () => {
    vi.mocked(requireSession).mockResolvedValue(mockUser as never);
    vi.mocked(upsertPlayer).mockResolvedValue([
      { id: "p1", userId: "u1", firstName: "Jean", lastName: "Tremblay" } as never,
    ]);

    const result = await upsertPlayerProfileAction("slug", validFormData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("p1");
    }
  });

  it("should reject when firstName is empty", async () => {
    vi.mocked(requireSession).mockResolvedValue(mockUser as never);

    const result = await upsertPlayerProfileAction("slug", {
      ...validFormData,
      firstName: "  ",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("required");
    }
  });

  it("should reject when lastName is empty", async () => {
    vi.mocked(requireSession).mockResolvedValue(mockUser as never);

    const result = await upsertPlayerProfileAction("slug", {
      ...validFormData,
      lastName: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("required");
    }
  });

  it("should reject when birthDate is missing", async () => {
    vi.mocked(requireSession).mockResolvedValue(mockUser as never);

    const result = await upsertPlayerProfileAction("slug", {
      ...validFormData,
      birthDate: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Birth date");
    }
  });

  it("should return error when DB upsert fails", async () => {
    vi.mocked(requireSession).mockResolvedValue(mockUser as never);
    vi.mocked(upsertPlayer).mockResolvedValue([undefined as never]);

    const result = await upsertPlayerProfileAction("slug", validFormData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Failed");
    }
  });
});

describe("getPlayerProfileAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return player profile", async () => {
    vi.mocked(requireSession).mockResolvedValue(mockUser as never);
    vi.mocked(getPlayerByUserId).mockResolvedValue({
      id: "p1",
      userId: "u1",
      firstName: "Jean",
      lastName: "Tremblay",
      birthDate: new Date("1995-06-15"),
      club: "BSL Badminton",
      licenseNumber: "QC-12345",
    } as never);

    const result = await getPlayerProfileAction();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toBeNull();
      expect(result.data!.firstName).toBe("Jean");
    }
  });

  it("should return null when no player profile exists", async () => {
    vi.mocked(requireSession).mockResolvedValue(mockUser as never);
    vi.mocked(getPlayerByUserId).mockResolvedValue(undefined);

    const result = await getPlayerProfileAction();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
  });
});
