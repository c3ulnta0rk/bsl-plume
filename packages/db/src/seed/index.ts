import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createDb } from "../index";
import { seedDevelopment } from "./scenarios/development";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const envPath = resolve(__dirname, "../../../../.env");
    const content = readFileSync(envPath, "utf-8");
    const match = content.match(/^DATABASE_URL=(.+)$/m);
    return match?.[1]?.trim() ?? "";
  } catch {
    return "";
  }
}

const DATABASE_URL = loadDatabaseUrl();
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
