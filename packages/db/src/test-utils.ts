import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createDb, type Database } from "./index";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const envPath = resolve(__dirname, "../../../.env");
    const content = readFileSync(envPath, "utf-8");
    const match = content.match(/^DATABASE_URL=(.+)$/m);
    return match?.[1]?.trim() ?? "";
  } catch {
    return "";
  }
}

let dbInstance: Database | null = null;

export function getTestDb(): Database {
  if (!dbInstance) {
    const url = loadDatabaseUrl();
    if (!url) {
      throw new Error(
        "DATABASE_URL is required for integration tests. Set it in .env or environment.",
      );
    }
    dbInstance = createDb(url);
  }
  return dbInstance;
}

/**
 * Wraps a test function in a transaction that is always rolled back.
 * Provides full test isolation without polluting the database.
 */
export async function withRollback(
  fn: (tx: Database) => Promise<void>,
): Promise<void> {
  const db = getTestDb();

  // drizzle-orm transaction — throwing aborts and rolls back
  try {
    await db.transaction(async (tx) => {
      await fn(tx as unknown as Database);
      // Always rollback by throwing after test completes
      throw new RollbackSignal();
    });
  } catch (error) {
    if (error instanceof RollbackSignal) {
      return; // Expected — test passed, transaction rolled back
    }
    throw error; // Re-throw real errors
  }
}

class RollbackSignal extends Error {
  constructor() {
    super("ROLLBACK");
    this.name = "RollbackSignal";
  }
}
