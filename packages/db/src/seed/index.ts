import { createDb } from "../index";
import { seedDevelopment } from "./scenarios/development";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

const db = createDb(DATABASE_URL);

async function main() {
  console.log("Seeding database...");
  await seedDevelopment(db);
  console.log("Seeding complete!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
