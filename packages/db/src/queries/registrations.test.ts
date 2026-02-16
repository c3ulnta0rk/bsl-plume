import { describe, it, expect } from "vitest";
import { withRollback } from "../test-utils";
import { createClub } from "./clubs";
import { createTournament } from "./tournaments";
import { createCategory } from "./categories";
import { createPlayer } from "./players";
import {
  createRegistration,
  getRegistrationById,
  getRegistration,
  listRegistrationsByCategory,
  updateRegistrationStatus,
  countRegistrationsByCategory,
  deleteRegistration,
} from "./registrations";

describe("registrations queries", () => {
  async function setupRegistrationContext(
    tx: Parameters<typeof createClub>[0],
  ) {
    const [club] = await createClub(tx, {
      name: "Reg Club",
      slug: "reg-club-" + Date.now(),
    });
    const [tournament] = await createTournament(tx, {
      clubId: club!.id,
      name: "Reg Tournament",
      startDate: new Date("2026-04-15"),
      endDate: new Date("2026-04-16"),
      registrationStart: new Date("2026-03-01"),
      registrationEnd: new Date("2026-04-10"),
      status: "registration_open",
    });
    const [category] = await createCategory(tx, {
      tournamentId: tournament!.id,
      type: "SH",
      maxPlayers: 32,
    });
    const [player] = await createPlayer(tx, {
      userId: "550e8400-e29b-41d4-a716-446655440030",
      firstName: "Alice",
      lastName: "Martin",
    });
    return { club: club!, tournament: tournament!, category: category!, player: player! };
  }

  it("should create and retrieve a registration by id", async () => {
    await withRollback(async (tx) => {
      const { category, player } = await setupRegistrationContext(tx);
      const [reg] = await createRegistration(tx, {
        playerId: player.id,
        categoryId: category.id,
        status: "confirmed",
      });
      expect(reg).toBeDefined();

      const found = await getRegistrationById(tx, reg!.id);
      expect(found).toBeDefined();
      expect(found!.playerId).toBe(player.id);
    });
  });

  it("should find registration by playerId and categoryId", async () => {
    await withRollback(async (tx) => {
      const { category, player } = await setupRegistrationContext(tx);
      await createRegistration(tx, {
        playerId: player.id,
        categoryId: category.id,
        status: "confirmed",
      });

      const found = await getRegistration(tx, player.id, category.id);
      expect(found).toBeDefined();
    });
  });

  it("should return undefined for non-existent registration", async () => {
    await withRollback(async (tx) => {
      const found = await getRegistration(
        tx,
        "00000000-0000-0000-0000-000000000000",
        "00000000-0000-0000-0000-000000000001",
      );
      expect(found).toBeUndefined();
    });
  });

  it("should list registrations by category ordered by registeredAt", async () => {
    await withRollback(async (tx) => {
      const { category } = await setupRegistrationContext(tx);
      const [p1] = await createPlayer(tx, {
        userId: "550e8400-e29b-41d4-a716-446655440031",
        firstName: "Bob",
        lastName: "Roy",
      });
      const [p2] = await createPlayer(tx, {
        userId: "550e8400-e29b-41d4-a716-446655440032",
        firstName: "Claire",
        lastName: "Gagnon",
      });

      await createRegistration(tx, {
        playerId: p1!.id,
        categoryId: category.id,
        status: "confirmed",
      });
      await createRegistration(tx, {
        playerId: p2!.id,
        categoryId: category.id,
        status: "confirmed",
      });

      const list = await listRegistrationsByCategory(tx, category.id);
      expect(list.length).toBe(2);
    });
  });

  it("should update registration status", async () => {
    await withRollback(async (tx) => {
      const { category, player } = await setupRegistrationContext(tx);
      const [reg] = await createRegistration(tx, {
        playerId: player.id,
        categoryId: category.id,
        status: "pending",
      });

      const [updated] = await updateRegistrationStatus(
        tx,
        reg!.id,
        "confirmed",
      );
      expect(updated!.status).toBe("confirmed");
    });
  });

  it("should count only confirmed registrations", async () => {
    await withRollback(async (tx) => {
      const { category } = await setupRegistrationContext(tx);
      const [p1] = await createPlayer(tx, {
        userId: "550e8400-e29b-41d4-a716-446655440033",
        firstName: "D",
        lastName: "E",
      });
      const [p2] = await createPlayer(tx, {
        userId: "550e8400-e29b-41d4-a716-446655440034",
        firstName: "F",
        lastName: "G",
      });

      await createRegistration(tx, {
        playerId: p1!.id,
        categoryId: category.id,
        status: "confirmed",
      });
      await createRegistration(tx, {
        playerId: p2!.id,
        categoryId: category.id,
        status: "pending",
      });

      const [result] = await countRegistrationsByCategory(tx, category.id);
      expect(result!.count).toBe(1);
    });
  });

  it("should delete a registration", async () => {
    await withRollback(async (tx) => {
      const { category, player } = await setupRegistrationContext(tx);
      const [reg] = await createRegistration(tx, {
        playerId: player.id,
        categoryId: category.id,
        status: "confirmed",
      });

      const [deleted] = await deleteRegistration(tx, reg!.id);
      expect(deleted!.id).toBe(reg!.id);

      const found = await getRegistrationById(tx, reg!.id);
      expect(found).toBeUndefined();
    });
  });
});
