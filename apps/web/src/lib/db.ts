import { createDb } from "@bsl-plume/db";

function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  return createDb(url);
}

// Singleton pattern for server-side DB connection
const globalForDb = globalThis as unknown as { db: ReturnType<typeof createDb> | undefined };
export const db = globalForDb.db ?? getDb();
if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db;
}
