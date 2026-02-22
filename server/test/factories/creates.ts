import { db } from '@nuxthub/db'
import { clubs } from '../../db/schema/clubs'
import { users } from '../../db/schema/users'
import { tournaments } from '../../db/schema/tournaments'
import { categoryTypes, categories } from '../../db/schema/categories'
import { teams } from '../../db/schema/teams'
import { phases } from '../../db/schema/rounds'
import { pools } from '../../db/schema/pools'
import { poolEntries } from '../../db/schema/poolEntries'
import { matches } from '../../db/schema/matchs'
import { sets } from '../../db/schema/sets'
import type { Club } from '../../db/schema/clubs'
import type { User } from '../../db/schema/users'
import type { Tournament } from '../../db/schema/tournaments'
import type { CategoryType, Category } from '../../db/schema/categories'
import type { Team } from '../../db/schema/teams'
import type { Phase } from '../../db/schema/rounds'
import type { Pool } from '../../db/schema/pools'
import type { PoolEntry } from '../../db/schema/poolEntries'
import type { Match } from '../../db/schema/matchs'
import type { Set } from '../../db/schema/sets'
import {
  buildClub,
  buildUser,
  buildTournament,
  buildCategoryType,
  buildCategory,
  buildTeam,
  buildPhase,
  buildPool,
  buildPoolEntry,
  buildMatch,
  buildSet,
} from './builds'

export async function createClub(overrides?: Partial<Club>): Promise<Club> {
  const data = buildClub(overrides)
  const [row] = await db.insert(clubs).values(data).returning()
  return row!
}

export async function createUser(overrides?: Partial<User>): Promise<User> {
  const data = buildUser(overrides)
  const [row] = await db.insert(users).values(data).returning()
  return row!
}

export async function createTournament(overrides?: Partial<Tournament>): Promise<Tournament> {
  const data = buildTournament(overrides)
  if (!overrides?.clubId) {
    const club = await createClub()
    data.clubId = club.id
  }
  const [row] = await db.insert(tournaments).values(data).returning()
  return row!
}

export async function createCategoryType(overrides?: Partial<CategoryType>): Promise<CategoryType> {
  const data = buildCategoryType(overrides)
  const [row] = await db.insert(categoryTypes).values(data).returning()
  return row!
}

export async function createCategory(overrides?: Partial<Category>): Promise<Category> {
  const data = buildCategory(overrides)
  if (!overrides?.tournamentId) {
    const tournament = await createTournament()
    data.tournamentId = tournament.id
  }
  if (!overrides?.categoryTypeId) {
    const ct = await createCategoryType()
    data.categoryTypeId = ct.id
  }
  const [row] = await db.insert(categories).values(data).returning()
  return row!
}

export async function createTeam(overrides?: Partial<Team>): Promise<Team> {
  const data = buildTeam(overrides)
  if (!overrides?.playerOneId) {
    const user = await createUser()
    data.playerOneId = user.id
  }
  if (!overrides?.tournamentId || !overrides?.categoryId) {
    const category = await createCategory()
    if (!overrides?.tournamentId) data.tournamentId = category.tournamentId
    if (!overrides?.categoryId) data.categoryId = category.id
  }
  const [row] = await db.insert(teams).values(data).returning()
  return row!
}

export async function createPhase(overrides?: Partial<Phase>): Promise<Phase> {
  const data = buildPhase(overrides)
  if (!overrides?.categoryId) {
    const category = await createCategory()
    data.categoryId = category.id
  }
  const [row] = await db.insert(phases).values(data).returning()
  return row!
}

export async function createPool(overrides?: Partial<Pool>): Promise<Pool> {
  const data = buildPool(overrides)
  if (!overrides?.phaseId) {
    const phase = await createPhase({ type: 'pool' })
    data.phaseId = phase.id
  }
  const [row] = await db.insert(pools).values(data).returning()
  return row!
}

export async function createPoolEntry(overrides?: Partial<PoolEntry>): Promise<PoolEntry> {
  const data = buildPoolEntry(overrides)
  if (!overrides?.poolId) {
    const pool = await createPool()
    data.poolId = pool.id
  }
  if (!overrides?.teamId) {
    const team = await createTeam()
    data.teamId = team.id
  }
  const [row] = await db.insert(poolEntries).values(data).returning()
  return row!
}

export async function createMatch(overrides?: Partial<Match>): Promise<Match> {
  const data = buildMatch(overrides)
  if (!overrides?.phaseId) {
    const phase = await createPhase()
    data.phaseId = phase.id
  }
  const [row] = await db.insert(matches).values(data).returning()
  return row!
}

export async function createSet(overrides?: Partial<Set>): Promise<Set> {
  const data = buildSet(overrides)
  if (!overrides?.matchId) {
    const match = await createMatch()
    data.matchId = match.id
  }
  const [row] = await db.insert(sets).values(data).returning()
  return row!
}
