import type { Db } from '../db'
import { schema } from '../db'

export async function log(db: Db, tournamentId: string, userId: string | null, type: string, message: string): Promise<void> {
  await db.insert(schema.journal).values({ tournamentId, userId, type, message })
}
