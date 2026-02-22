import { faker } from '@faker-js/faker/locale/fr'
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

export function buildClub(overrides?: Partial<Club>): Club {
  return {
    id: crypto.randomUUID(),
    name: faker.company.name(),
    createdAt: new Date(),
    ...overrides,
  }
}

export function buildUser(overrides?: Partial<User>): User {
  return {
    id: crypto.randomUUID(),
    email: faker.internet.email().toLowerCase(),
    name: faker.person.fullName(),
    passwordHash: faker.string.alphanumeric(64),
    role: 'user',
    clubId: null,
    licenseNumber: faker.string.numeric(7),
    createdAt: new Date(),
    ...overrides,
  }
}

export function buildTournament(overrides?: Partial<Tournament>): Tournament {
  return {
    id: crypto.randomUUID(),
    name: `Tournoi ${faker.location.city()}`,
    clubId: crypto.randomUUID(),
    date: faker.date.future(),
    location: faker.location.city(),
    status: 'draft',
    createdAt: new Date(),
    ...overrides,
  }
}

export function buildCategoryType(overrides?: Partial<CategoryType>): CategoryType {
  const type = faker.helpers.arrayElement(['singles', 'doubles', 'mixed'] as const)
  const gender = type === 'mixed' ? 'mixed' : faker.helpers.arrayElement(['M', 'F'] as const)
  return {
    id: crypto.randomUUID(),
    name: faker.helpers.arrayElement(['Simple Homme', 'Simple Dame', 'Double Homme', 'Double Dame', 'Double Mixte']),
    type,
    gender,
    ...overrides,
  }
}

export function buildCategory(overrides?: Partial<Category>): Category {
  return {
    id: crypto.randomUUID(),
    tournamentId: crypto.randomUUID(),
    categoryTypeId: crypto.randomUUID(),
    maxTeams: faker.helpers.arrayElement([8, 16, 32]),
    status: 'pending',
    createdAt: new Date(),
    ...overrides,
  }
}

export function buildTeam(overrides?: Partial<Team>): Team {
  return {
    id: crypto.randomUUID(),
    name: `${faker.person.lastName()} / ${faker.person.lastName()}`,
    playerOneId: crypto.randomUUID(),
    playerTwoId: null,
    tournamentId: crypto.randomUUID(),
    categoryId: crypto.randomUUID(),
    seed: null,
    createdAt: new Date(),
    ...overrides,
  }
}

export function buildPhase(overrides?: Partial<Phase>): Phase {
  const type = faker.helpers.arrayElement(['pool', 'knockout'] as const)
  return {
    id: crypto.randomUUID(),
    categoryId: crypto.randomUUID(),
    name: type === 'pool' ? 'Poules' : 'Elimination',
    type,
    phaseOrder: 1,
    config: {},
    status: 'pending',
    createdAt: new Date(),
    ...overrides,
  }
}

export function buildPool(overrides?: Partial<Pool>): Pool {
  return {
    id: crypto.randomUUID(),
    phaseId: crypto.randomUUID(),
    name: faker.helpers.arrayElement(['A', 'B', 'C', 'D']),
    ...overrides,
  }
}

export function buildPoolEntry(overrides?: Partial<PoolEntry>): PoolEntry {
  return {
    id: crypto.randomUUID(),
    poolId: crypto.randomUUID(),
    teamId: crypto.randomUUID(),
    finalRank: null,
    ...overrides,
  }
}

export function buildMatch(overrides?: Partial<Match>): Match {
  return {
    id: crypto.randomUUID(),
    phaseId: crypto.randomUUID(),
    poolId: null,
    team1Id: null,
    team2Id: null,
    winnerId: null,
    round: null,
    bracketPosition: null,
    nextMatchId: null,
    nextMatchSlot: null,
    status: 'pending',
    court: null,
    scheduledAt: null,
    ...overrides,
  }
}

export function buildSet(overrides?: Partial<Set>): Set {
  return {
    id: crypto.randomUUID(),
    matchId: crypto.randomUUID(),
    setNumber: 1,
    score1: faker.number.int({ min: 0, max: 21 }),
    score2: faker.number.int({ min: 0, max: 21 }),
    ...overrides,
  }
}
