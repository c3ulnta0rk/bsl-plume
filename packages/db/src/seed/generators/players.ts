import { randomUUID } from "node:crypto";
import { faker } from "@faker-js/faker/locale/fr_CA";
import type { Database } from "../../index";
import { players } from "../../schema/players";
import { registrations } from "../../schema/registrations";

export interface RegistrationConfig {
  categoryId: string;
  playerCount: number;
  status: "confirmed" | "pending" | "mixed";
}

/**
 * Seed players and register them to specific categories.
 * Players are created once then distributed across registration configs.
 */
export async function seedPlayers(
  db: Database,
  count: number,
  registrationConfigs: RegistrationConfig[],
) {
  const seedData = Array.from({ length: count }, () => ({
    userId: randomUUID(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    birthDate: faker.date.birthdate({ min: 14, max: 65, mode: "age" }),
    club: faker.helpers.arrayElement([
      "BSL Badminton",
      "Volants de RDL",
      "Matane Smash",
      null,
    ]),
    licenseNumber: faker.helpers.maybe(
      () => `QC-${faker.string.numeric(6)}`,
      { probability: 0.7 },
    ),
  }));

  const createdPlayers = await db
    .insert(players)
    .values(seedData)
    .returning();

  // Build registrations from configs
  const registrationData: Array<{
    playerId: string;
    categoryId: string;
    status: string;
  }> = [];

  // Track which players have been used per category to avoid duplicates
  let playerPool = [...createdPlayers];

  for (const config of registrationConfigs) {
    const available = playerPool.slice(0, config.playerCount);
    // Rotate the pool so different categories get different players
    playerPool = [...playerPool.slice(config.playerCount), ...available];

    for (const player of available) {
      let status: string;
      if (config.status === "mixed") {
        status = Math.random() < 0.7 ? "confirmed" : "pending";
      } else {
        status = config.status;
      }
      registrationData.push({
        playerId: player.id,
        categoryId: config.categoryId,
        status,
      });
    }
  }

  if (registrationData.length > 0) {
    await db.insert(registrations).values(registrationData);
  }

  return createdPlayers;
}

/**
 * Get player IDs registered for a specific category (confirmed only).
 */
export function getRegisteredPlayerIds(
  allRegistrations: Array<{ playerId: string; categoryId: string; status: string }>,
  categoryId: string,
): string[] {
  return allRegistrations
    .filter((r) => r.categoryId === categoryId && r.status === "confirmed")
    .map((r) => r.playerId);
}
