import { describe, it, expect } from "vitest";
import { withRollback } from "../test-utils";
import {
  createClub,
  getClubBySlug,
  getClubById,
  listClubs,
  updateClub,
  addClubMember,
  getClubMembership,
} from "./clubs";

describe("clubs queries", () => {
  const clubData = {
    name: "Test Club",
    slug: "test-club-" + Date.now(),
    primaryColor: "#ff0000",
  };

  it("should create a club and find it by slug", async () => {
    await withRollback(async (tx) => {
      const [club] = await createClub(tx, clubData);
      expect(club).toBeDefined();

      const found = await getClubBySlug(tx, club!.slug);
      expect(found).toBeDefined();
      expect(found!.name).toBe("Test Club");
    });
  });

  it("should return undefined for non-existent slug", async () => {
    await withRollback(async (tx) => {
      const found = await getClubBySlug(tx, "slug-does-not-exist-xyz");
      expect(found).toBeUndefined();
    });
  });

  it("should find a club by id", async () => {
    await withRollback(async (tx) => {
      const [club] = await createClub(tx, clubData);
      const found = await getClubById(tx, club!.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(club!.id);
    });
  });

  it("should return undefined for non-existent id", async () => {
    await withRollback(async (tx) => {
      const found = await getClubById(
        tx,
        "00000000-0000-0000-0000-000000000000",
      );
      expect(found).toBeUndefined();
    });
  });

  it("should list all clubs", async () => {
    await withRollback(async (tx) => {
      await createClub(tx, { name: "Club A", slug: "club-a-" + Date.now() });
      await createClub(tx, { name: "Club B", slug: "club-b-" + Date.now() });
      const clubs = await listClubs(tx);
      expect(clubs.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("should update a club", async () => {
    await withRollback(async (tx) => {
      const [club] = await createClub(tx, clubData);
      const [updated] = await updateClub(tx, club!.id, {
        name: "Updated Name",
      });
      expect(updated!.name).toBe("Updated Name");
      expect(updated!.updatedAt.getTime()).toBeGreaterThanOrEqual(
        club!.updatedAt.getTime(),
      );
    });
  });

  it("should add a club member and find membership", async () => {
    await withRollback(async (tx) => {
      const [club] = await createClub(tx, clubData);
      const userId = "550e8400-e29b-41d4-a716-446655440099";

      const [membership] = await addClubMember(tx, {
        userId,
        clubId: club!.id,
        role: "admin",
      });
      expect(membership).toBeDefined();
      expect(membership!.role).toBe("admin");

      const found = await getClubMembership(tx, userId, club!.id);
      expect(found).toBeDefined();
      expect(found!.userId).toBe(userId);
    });
  });

  it("should return undefined for non-existent membership", async () => {
    await withRollback(async (tx) => {
      const found = await getClubMembership(
        tx,
        "00000000-0000-0000-0000-000000000000",
        "00000000-0000-0000-0000-000000000001",
      );
      expect(found).toBeUndefined();
    });
  });
});
