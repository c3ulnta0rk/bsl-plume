import { db } from '@nuxthub/db'
import { sets } from '../../db/schema/sets'
import { matches } from '../../db/schema/matchs'
import { poolEntries } from '../../db/schema/poolEntries'
import { pools } from '../../db/schema/pools'
import { phases } from '../../db/schema/rounds'
import { teams } from '../../db/schema/teams'
import { categories, categoryTypes } from '../../db/schema/categories'
import { tournaments } from '../../db/schema/tournaments'
import { users } from '../../db/schema/users'
import { clubs } from '../../db/schema/clubs'

/** Delete all rows from all tables in FK-safe order */
export async function resetDatabase() {
  await db.delete(sets)
  await db.delete(matches)
  await db.delete(poolEntries)
  await db.delete(pools)
  await db.delete(phases)
  await db.delete(teams)
  await db.delete(categories)
  await db.delete(categoryTypes)
  await db.delete(tournaments)
  await db.delete(users)
  await db.delete(clubs)
}
