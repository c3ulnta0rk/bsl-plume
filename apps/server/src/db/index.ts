import { fileURLToPath } from 'node:url'
import { mkdirSync } from 'node:fs'
import type { PgDatabase } from 'drizzle-orm/pg-core'
import * as schema from './schema'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = PgDatabase<any, typeof schema>
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]
export { schema }

const migrationsFolder = fileURLToPath(new URL('../../migrations', import.meta.url))

/**
 * Deux modes, même schéma :
 * - DATABASE_URL défini : PostgreSQL (hébergement).
 * - sinon : PGlite, un PostgreSQL embarqué dans un simple dossier (développement, tests, mode salle).
 */
export async function openDb(opts: { url?: string, dataDir?: string | null } = {}): Promise<{ db: Db, close: () => Promise<void> }> {
  const url = opts.url ?? process.env.DATABASE_URL
  if (url) {
    const { default: postgres } = await import('postgres')
    const { drizzle } = await import('drizzle-orm/postgres-js')
    const { migrate } = await import('drizzle-orm/postgres-js/migrator')
    const client = postgres(url, { onnotice: () => {} })
    const db = drizzle(client, { schema })
    await migrate(db, { migrationsFolder })
    return { db: db as unknown as Db, close: () => client.end() }
  }
  const { PGlite } = await import('@electric-sql/pglite')
  const { drizzle } = await import('drizzle-orm/pglite')
  const { migrate } = await import('drizzle-orm/pglite/migrator')
  const dir = opts.dataDir === undefined ? (process.env.PLUME_DATA_DIR ?? '.data/pglite') : opts.dataDir
  if (dir) mkdirSync(dir, { recursive: true })
  const client = dir ? new PGlite(dir) : new PGlite()
  const db = drizzle(client, { schema })
  await migrate(db, { migrationsFolder })
  return { db: db as unknown as Db, close: () => client.close() }
}
