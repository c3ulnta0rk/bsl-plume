import { describe, it, expect } from "vitest";
import { withRollback } from "../test-utils";
import {
  createPlayer,
  getPlayerById,
  getPlayerByUserId,
  updatePlayer,
  upsertPlayer,
} from "./players";

describe("players queries", () => {
  const userId = "550e8400-e29b-41d4-a716-446655440010";

  const playerData = {
    userId,
    firstName: "Jean",
    lastName: "Tremblay",
    birthDate: new Date("1995-06-15"),
    club: "BSL Badminton",
    licenseNumber: "QC-12345",
  };

  it("should create and retrieve a player by id", async () => {
    await withRollback(async (tx) => {
      const [player] = await createPlayer(tx, playerData);
      expect(player).toBeDefined();

      const found = await getPlayerById(tx, player!.id);
      expect(found).toBeDefined();
      expect(found!.firstName).toBe("Jean");
      expect(found!.lastName).toBe("Tremblay");
    });
  });

  it("should find a player by userId", async () => {
    await withRollback(async (tx) => {
      await createPlayer(tx, playerData);
      const found = await getPlayerByUserId(tx, userId);
      expect(found).toBeDefined();
      expect(found!.userId).toBe(userId);
    });
  });

  it("should return undefined for non-existent userId", async () => {
    await withRollback(async (tx) => {
      const found = await getPlayerByUserId(
        tx,
        "00000000-0000-0000-0000-000000000000",
      );
      expect(found).toBeUndefined();
    });
  });

  it("should update a player", async () => {
    await withRollback(async (tx) => {
      const [player] = await createPlayer(tx, playerData);
      const [updated] = await updatePlayer(tx, player!.id, {
        firstName: "Pierre",
      });
      expect(updated!.firstName).toBe("Pierre");
      expect(updated!.lastName).toBe("Tremblay");
    });
  });

  it("should upsert — insert new player", async () => {
    await withRollback(async (tx) => {
      const newUserId = "550e8400-e29b-41d4-a716-446655440020";
      const [player] = await upsertPlayer(tx, {
        ...playerData,
        userId: newUserId,
      });
      expect(player).toBeDefined();
      expect(player!.userId).toBe(newUserId);
    });
  });

  it("should upsert — update existing player on userId conflict", async () => {
    await withRollback(async (tx) => {
      await createPlayer(tx, playerData);
      const [upserted] = await upsertPlayer(tx, {
        ...playerData,
        firstName: "Marc",
      });
      expect(upserted!.firstName).toBe("Marc");
      expect(upserted!.userId).toBe(userId);
    });
  });
});
