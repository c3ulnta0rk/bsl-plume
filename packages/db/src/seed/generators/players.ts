import { randomUUID } from "node:crypto";
import { faker } from "@faker-js/faker/locale/fr_CA";
import type { Database } from "../../index";
import { players } from "../../schema/players";
import { registrations } from "../../schema/registrations";

export async function seedPlayers(
  db: Database,
  count: number,
  categoryIds: string[],
) {
  const seedPlayers = Array.from({ length: count }, () => ({
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
    .values(seedPlayers)
    .returning();

  // Register some players to categories
  const registrationData: Array<{
    playerId: string;
    categoryId: string;
    status: string;
  }> = [];

  for (const player of createdPlayers) {
    // Each player registers for 1-3 random categories
    const numCategories = faker.number.int({ min: 1, max: 3 });
    const selectedCategories = faker.helpers.arrayElements(
      categoryIds,
      numCategories,
    );

    for (const categoryId of selectedCategories) {
      registrationData.push({
        playerId: player.id,
        categoryId,
        status: faker.helpers.arrayElement(["confirmed", "confirmed", "pending"]),
      });
    }
  }

  if (registrationData.length > 0) {
    await db.insert(registrations).values(registrationData);
  }

  return createdPlayers;
}
