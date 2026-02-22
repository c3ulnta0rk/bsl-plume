/**
 * Realistic seed script for BSL Plume admin testing.
 *
 * Creates 10 tournaments at various stages, ~203 users, realistic
 * badminton scores with round-robin pool play.
 *
 * Usage: npx tsx server/scripts/seed.ts
 */

import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { sql } from 'drizzle-orm'
import { faker } from '@faker-js/faker/locale/fr'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { scryptSync, randomBytes } from 'node:crypto'

import { clubs } from '../db/schema/clubs'
import { users } from '../db/schema/users'
import { categoryTypes, categories } from '../db/schema/categories'
import { tournaments } from '../db/schema/tournaments'
import { teams } from '../db/schema/teams'
import { phases } from '../db/schema/rounds'
import { pools } from '../db/schema/pools'
import { poolEntries } from '../db/schema/poolEntries'
import { matches } from '../db/schema/matchs'
import { sets } from '../db/schema/sets'

// ---------------------------------------------------------------------------
// DB connection
// ---------------------------------------------------------------------------

function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  try {
    const envFile = readFileSync(resolve(process.cwd(), '.env'), 'utf-8')
    const match = envFile.match(/^DATABASE_URL=(.+)$/m)
    if (match) return match[1]!
  } catch { /* ignore */ }
  throw new Error('DATABASE_URL not found in env or .env file')
}

const client = postgres(getDatabaseUrl(), { max: 1 })
const db = drizzle(client)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uuid(): string {
  return crypto.randomUUID()
}

/** Batch insert in chunks to avoid parameter limit (65535) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function batchInsert(
  table: Parameters<typeof db.insert>[0],
  rows: unknown[],
  chunkSize = 500
): Promise<void> {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    await db.insert(table).values(chunk as never)
  }
}

// Generate scrypt hash compatible with nuxt-auth-utils / @adonisjs/hash (PHC format without base64 padding)
function hashPasswordSync(password: string): string {
  const salt = randomBytes(16)
  const n = 16384, r = 8, p = 1, keylen = 64
  const derived = scryptSync(password, salt, keylen, { N: n, r, p })
  const saltB64 = salt.toString('base64').replace(/=+$/, '')
  const keyB64 = derived.toString('base64').replace(/=+$/, '')
  return `$scrypt$n=${n},r=${r},p=${p}$${saltB64}$${keyB64}`
}

const PASSWORD_HASH = hashPasswordSync('password123')

// Reproducible faker for consistent dev data
faker.seed(42)

// ---------------------------------------------------------------------------
// Score generation — realistic badminton
// ---------------------------------------------------------------------------

interface SetScore { score1: number; score2: number }

function generateSetScore(winnerIs1: boolean): SetScore {
  const isClose = Math.random() < 0.3 // 30% deuce scenarios
  let winner: number
  let loser: number

  if (isClose) {
    // Deuce: 22-30, always 2 apart, max 30-28
    const extra = faker.number.int({ min: 0, max: 4 }) // 0..4 → scores 22-20 to 30-28
    winner = 22 + extra
    loser = 20 + extra
  } else {
    // Clean win: 21 vs 5-19
    winner = 21
    loser = faker.number.int({ min: 5, max: 19 })
  }

  return winnerIs1 ? { score1: winner, score2: loser } : { score1: loser, score2: winner }
}

function generateMatchSets(winnerIs1: boolean): SetScore[] {
  const in2Sets = Math.random() < 0.8 // 80% won in 2 sets

  if (in2Sets) {
    return [
      generateSetScore(winnerIs1),
      generateSetScore(winnerIs1)
    ]
  }

  // 3 sets: winner loses one set
  const lostSetIndex = faker.number.int({ min: 0, max: 1 })
  return [0, 1, 2].map((i) => {
    if (i === lostSetIndex) return generateSetScore(!winnerIs1)
    return generateSetScore(winnerIs1)
  })
}

// ---------------------------------------------------------------------------
// Data definitions
// ---------------------------------------------------------------------------

const CLUBS_DATA = [
  { id: uuid(), name: 'BC Strasbourg' },
  { id: uuid(), name: 'BC Mulhouse' },
  { id: uuid(), name: 'BC Colmar' }
] as const satisfies ReadonlyArray<{ id: string; name: string }>

const CATEGORY_TYPES_DATA = [
  { id: uuid(), name: 'Simple Homme', type: 'singles', gender: 'M' },
  { id: uuid(), name: 'Simple Dame', type: 'singles', gender: 'F' },
  { id: uuid(), name: 'Double Homme', type: 'doubles', gender: 'M' },
  { id: uuid(), name: 'Double Dame', type: 'doubles', gender: 'F' },
  { id: uuid(), name: 'Double Mixte', type: 'mixed', gender: 'mixed' },
  { id: uuid(), name: 'Simple Homme Promo', type: 'singles', gender: 'M' },
  { id: uuid(), name: 'Simple Dame Promo', type: 'singles', gender: 'F' }
] as const satisfies ReadonlyArray<{ id: string; name: string; type: string; gender: string }>

// Category config: teams per tournament, pool size always 4
interface CatConfig {
  catTypeIndex: number
  teamCount: number
  poolSize: number
  gender: 'M' | 'F' | 'mixed'
  isDoubles: boolean
}

const CATEGORY_CONFIGS: CatConfig[] = [
  { catTypeIndex: 0, teamCount: 32, poolSize: 4, gender: 'M', isDoubles: false },       // SH
  { catTypeIndex: 1, teamCount: 24, poolSize: 4, gender: 'F', isDoubles: false },       // SD
  { catTypeIndex: 2, teamCount: 16, poolSize: 4, gender: 'M', isDoubles: true },        // DH
  { catTypeIndex: 3, teamCount: 12, poolSize: 4, gender: 'F', isDoubles: true },        // DD
  { catTypeIndex: 4, teamCount: 24, poolSize: 4, gender: 'mixed', isDoubles: true },    // DM
  { catTypeIndex: 5, teamCount: 24, poolSize: 4, gender: 'M', isDoubles: false },       // SHP
  { catTypeIndex: 6, teamCount: 16, poolSize: 4, gender: 'F', isDoubles: false }        // SDP
]

// ---------------------------------------------------------------------------
// User generation
// ---------------------------------------------------------------------------

interface SeedUser {
  id: string
  email: string
  passwordHash: string
  name: string
  role: string
  clubId: string
  licenseNumber: string
}

function generateUsers(clubIds: string[]): { admin: SeedUser; males: SeedUser[]; females: SeedUser[] } {
  const admin: SeedUser = {
    id: uuid(),
    email: 'admin@bsl.fr',
    passwordHash: PASSWORD_HASH,
    name: 'Admin BSL',
    role: 'admin',
    clubId: clubIds[0]!,
    licenseNumber: '0000001'
  }

  const males: SeedUser[] = Array.from({ length: 100 }, () => {
    const firstName = faker.person.firstName('male')
    const lastName = faker.person.lastName()
    return {
      id: uuid(),
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      passwordHash: PASSWORD_HASH,
      name: `${firstName} ${lastName}`,
      role: 'user',
      clubId: faker.helpers.arrayElement(clubIds),
      licenseNumber: faker.string.numeric(7)
    }
  })

  const females: SeedUser[] = Array.from({ length: 100 }, () => {
    const firstName = faker.person.firstName('female')
    const lastName = faker.person.lastName()
    return {
      id: uuid(),
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      passwordHash: PASSWORD_HASH,
      name: `${firstName} ${lastName}`,
      role: 'user',
      clubId: faker.helpers.arrayElement(clubIds),
      licenseNumber: faker.string.numeric(7)
    }
  })

  // Deduplicate emails (very unlikely with faker but be safe)
  const seen = new Set<string>([admin.email])
  for (const list of [males, females]) {
    for (const u of list) {
      while (seen.has(u.email)) {
        u.email = `${faker.string.alphanumeric(4)}_${u.email}`
      }
      seen.add(u.email)
    }
  }

  return { admin, males, females }
}

// ---------------------------------------------------------------------------
// Tournament generation
// ---------------------------------------------------------------------------

interface TournamentDef {
  id: string
  name: string
  clubId: string
  date: Date
  location: string
  status: string
}

function generateTournaments(clubIds: string[]): TournamentDef[] {
  const locations = ['Strasbourg', 'Mulhouse', 'Colmar', 'Haguenau', 'Schiltigheim', 'Illkirch', 'Sélestat', 'Saverne', 'Obernai', 'Wissembourg']
  const result: TournamentDef[] = []

  for (let i = 0; i < 10; i++) {
    const isArchived = i < 7
    const status = isArchived ? 'archived' : 'published'
    // Archived tournaments in past, published ones in near future/present
    const date = isArchived
      ? faker.date.between({ from: new Date('2025-01-01'), to: new Date('2025-12-31') })
      : faker.date.between({ from: new Date('2026-01-15'), to: new Date('2026-03-31') })

    result.push({
      id: uuid(),
      name: `Tournoi de ${locations[i]!}`,
      clubId: clubIds[i % clubIds.length]!,
      date,
      location: locations[i]!,
      status
    })
  }

  return result
}

// ---------------------------------------------------------------------------
// Team assignment — players can overlap across categories in same tournament
// ---------------------------------------------------------------------------

interface TeamDef {
  id: string
  name: string
  playerOneId: string
  playerTwoId: string | null
  tournamentId: string
  categoryId: string
  seed: number | null
}

function assignTeams(
  tournamentId: string,
  categoryId: string,
  config: CatConfig,
  males: SeedUser[],
  females: SeedUser[]
): TeamDef[] {
  const teamDefs: TeamDef[] = []

  if (config.isDoubles && config.gender === 'mixed') {
    // Mixed doubles: pair 1 male + 1 female
    const mPool = faker.helpers.shuffle([...males])
    const fPool = faker.helpers.shuffle([...females])
    for (let t = 0; t < config.teamCount; t++) {
      const p1 = mPool[t % mPool.length]!
      const p2 = fPool[t % fPool.length]!
      teamDefs.push({
        id: uuid(),
        name: `${p1.name} / ${p2.name}`,
        playerOneId: p1.id,
        playerTwoId: p2.id,
        tournamentId,
        categoryId,
        seed: t < 4 ? t + 1 : null
      })
    }
  } else if (config.isDoubles) {
    // Same-gender doubles
    const pool = faker.helpers.shuffle([...(config.gender === 'M' ? males : females)])
    for (let t = 0; t < config.teamCount; t++) {
      const p1 = pool[(t * 2) % pool.length]!
      const p2 = pool[(t * 2 + 1) % pool.length]!
      teamDefs.push({
        id: uuid(),
        name: `${p1.name} / ${p2.name}`,
        playerOneId: p1.id,
        playerTwoId: p2.id,
        tournamentId,
        categoryId,
        seed: t < 4 ? t + 1 : null
      })
    }
  } else {
    // Singles
    const pool = faker.helpers.shuffle([...(config.gender === 'M' ? males : females)])
    for (let t = 0; t < config.teamCount; t++) {
      const p = pool[t % pool.length]!
      teamDefs.push({
        id: uuid(),
        name: p.name,
        playerOneId: p.id,
        playerTwoId: null,
        tournamentId,
        categoryId,
        seed: t < 4 ? t + 1 : null
      })
    }
  }

  return teamDefs
}

// ---------------------------------------------------------------------------
// Pool + match generation (round-robin within pools of 4)
// ---------------------------------------------------------------------------

interface PoolGenResult {
  phaseDef: { id: string; categoryId: string; name: string; type: string; phaseOrder: number; config: Record<string, unknown>; status: string }
  poolDefs: { id: string; phaseId: string; name: string }[]
  entryDefs: { id: string; poolId: string; teamId: string; finalRank: number | null }[]
  matchDefs: { id: string; phaseId: string; poolId: string; team1Id: string; team2Id: string; winnerId: string | null; status: string; court: string | null; scheduledAt: Date | null; round: number | null; bracketPosition: number | null; nextMatchId: string | null; nextMatchSlot: number | null }[]
  setDefs: { id: string; matchId: string; setNumber: number; score1: number; score2: number }[]
}

function generatePoolPhase(
  categoryId: string,
  teamDefs: TeamDef[],
  completionRate: number, // 1.0 = all completed, 0.6 = 60% completed
  phaseStatus: string
): PoolGenResult {
  const phaseId = uuid()
  const poolSize = 4
  const poolCount = Math.ceil(teamDefs.length / poolSize)

  const phaseDef = {
    id: phaseId,
    categoryId,
    name: 'Poules',
    type: 'pool' as const,
    phaseOrder: 1,
    config: { poolSize, poolCount },
    status: phaseStatus
  }

  // Distribute teams to pools in snake order (for seeding fairness)
  const sortedTeams = [...teamDefs]
  const poolAssignment: string[][] = Array.from({ length: poolCount }, () => [])
  sortedTeams.forEach((t, idx) => {
    const poolIdx = idx % poolCount
    poolAssignment[poolIdx]!.push(t.id)
  })

  const poolDefs = poolAssignment.map((_, idx) => ({
    id: uuid(),
    phaseId,
    name: String.fromCharCode(65 + idx) // A, B, C...
  }))

  const entryDefs: PoolGenResult['entryDefs'] = []
  const matchDefs: PoolGenResult['matchDefs'] = []
  const setDefs: PoolGenResult['setDefs'] = []

  const courts = ['Court 1', 'Court 2', 'Court 3', 'Court 4', 'Court 5', 'Court 6']

  for (let p = 0; p < poolCount; p++) {
    const poolTeamIds = poolAssignment[p]!
    const poolId = poolDefs[p]!.id

    // Pool entries
    for (const teamId of poolTeamIds) {
      entryDefs.push({
        id: uuid(),
        poolId,
        teamId,
        finalRank: completionRate === 1 ? null : null // Will set ranks for completed tournaments below
      })
    }

    // Round-robin: every pair plays
    const matchesInPool: { team1Id: string; team2Id: string }[] = []
    for (let i = 0; i < poolTeamIds.length; i++) {
      for (let j = i + 1; j < poolTeamIds.length; j++) {
        matchesInPool.push({ team1Id: poolTeamIds[i]!, team2Id: poolTeamIds[j]! })
      }
    }

    // Generate matches
    let matchIndex = 0
    for (const m of matchesInPool) {
      const isCompleted = Math.random() < completionRate
      const matchId = uuid()
      const winnerIs1 = Math.random() < 0.5

      if (isCompleted) {
        const winnerId = winnerIs1 ? m.team1Id : m.team2Id
        matchDefs.push({
          id: matchId,
          phaseId,
          poolId,
          team1Id: m.team1Id,
          team2Id: m.team2Id,
          winnerId,
          status: 'completed',
          court: courts[matchIndex % courts.length]!,
          scheduledAt: null,
          round: null,
          bracketPosition: null,
          nextMatchId: null,
          nextMatchSlot: null
        })

        // Generate sets with realistic scores
        const matchSets = generateMatchSets(winnerIs1)
        matchSets.forEach((s, sIdx) => {
          setDefs.push({
            id: uuid(),
            matchId,
            setNumber: sIdx + 1,
            score1: s.score1,
            score2: s.score2
          })
        })
      } else {
        matchDefs.push({
          id: matchId,
          phaseId,
          poolId,
          team1Id: m.team1Id,
          team2Id: m.team2Id,
          winnerId: null,
          status: 'pending',
          court: courts[matchIndex % courts.length]!,
          scheduledAt: null,
          round: null,
          bracketPosition: null,
          nextMatchId: null,
          nextMatchSlot: null
        })
      }
      matchIndex++
    }
  }

  // For fully completed phases, compute final ranks based on wins
  if (completionRate === 1) {
    for (let p = 0; p < poolCount; p++) {
      const poolId = poolDefs[p]!.id
      const poolTeamIds = poolAssignment[p]!
      const wins = new Map<string, number>()
      for (const tid of poolTeamIds) wins.set(tid, 0)

      for (const m of matchDefs) {
        if (m.poolId === poolId && m.winnerId) {
          wins.set(m.winnerId, (wins.get(m.winnerId) ?? 0) + 1)
        }
      }

      const ranked = [...wins.entries()].sort((a, b) => b[1] - a[1])
      for (let r = 0; r < ranked.length; r++) {
        const entry = entryDefs.find((e) => e.poolId === poolId && e.teamId === ranked[r]![0])
        if (entry) entry.finalRank = r + 1
      }
    }
  }

  return { phaseDef, poolDefs, entryDefs, matchDefs, setDefs }
}

// ---------------------------------------------------------------------------
// Knockout bracket generation — single-elimination from pool winners
// ---------------------------------------------------------------------------

interface KnockoutGenResult {
  phaseDef: PoolGenResult['phaseDef']
  matchDefs: PoolGenResult['matchDefs'][number][]
  setDefs: PoolGenResult['setDefs'][number][]
}

/** Round up to the next power of two */
function nextPow2(n: number): number {
  let v = 1
  while (v < n) v *= 2
  return v
}

/**
 * Build a single-elimination bracket from qualified teams.
 * `qualifiedTeams` are ordered by seed (pool rank 1 first, then rank 2, etc.).
 * Matches are created bottom-up so that `nextMatchId` links are set correctly.
 * If completionRate is 1 all matches are played; otherwise only early rounds.
 */
function generateKnockoutPhase(
  categoryId: string,
  qualifiedTeams: { teamId: string }[],
  completionRate: number,
  phaseStatus: string,
  phaseOrder: number
): KnockoutGenResult {
  const phaseId = uuid()
  const teamCount = qualifiedTeams.length
  const bracketSize = nextPow2(teamCount) // e.g. 8 teams → 8, 6 teams → 8 (with 2 byes)
  const totalRounds = Math.log2(bracketSize) // e.g. 8 → 3 rounds

  const phaseDef: KnockoutGenResult['phaseDef'] = {
    id: phaseId,
    categoryId,
    name: 'Élimination',
    type: 'knockout',
    phaseOrder,
    config: { bracketSize, qualifiedCount: teamCount },
    status: phaseStatus
  }

  // Build bracket structure round by round (round 1 = first round, highest round = final)
  // matchesByRound[round] = array of matches in that round
  const matchesByRound: Map<number, { id: string; bracketPosition: number; team1Id: string | null; team2Id: string | null }[]> = new Map()

  // Seed placement for first round (standard tournament seeding)
  // Position 1 vs bracketSize, 2 vs bracketSize-1, etc.
  const firstRoundSlots: { team1Id: string | null; team2Id: string | null }[] = []
  for (let i = 0; i < bracketSize / 2; i++) {
    const seedA = i
    const seedB = bracketSize - 1 - i
    const teamA = seedA < teamCount ? qualifiedTeams[seedA]!.teamId : null
    const teamB = seedB < teamCount ? qualifiedTeams[seedB]!.teamId : null
    firstRoundSlots.push({ team1Id: teamA, team2Id: teamB })
  }

  // Create first round matches
  const round1: typeof matchesByRound extends Map<number, infer V> ? V : never = []
  for (let pos = 0; pos < firstRoundSlots.length; pos++) {
    const slot = firstRoundSlots[pos]!
    round1.push({
      id: uuid(),
      bracketPosition: pos + 1,
      team1Id: slot.team1Id,
      team2Id: slot.team2Id
    })
  }
  matchesByRound.set(1, round1)

  // Create subsequent rounds
  for (let r = 2; r <= totalRounds; r++) {
    const prevRound = matchesByRound.get(r - 1)!
    const currentRound: typeof round1 = []
    for (let pos = 0; pos < prevRound.length / 2; pos++) {
      currentRound.push({
        id: uuid(),
        bracketPosition: pos + 1,
        team1Id: null,
        team2Id: null
      })
    }
    matchesByRound.set(r, currentRound)
  }

  // Now generate match defs and sets
  const matchDefs: KnockoutGenResult['matchDefs'] = []
  const setDefs: KnockoutGenResult['setDefs'] = []
  const courts = ['Court 1', 'Court 2', 'Court 3', 'Court 4', 'Court 5', 'Court 6']

  // Process round by round, propagating winners
  for (let r = 1; r <= totalRounds; r++) {
    const roundMatches = matchesByRound.get(r)!
    const nextRoundMatches = r < totalRounds ? matchesByRound.get(r + 1)! : null

    for (let i = 0; i < roundMatches.length; i++) {
      const m = roundMatches[i]!
      const nextMatch = nextRoundMatches ? nextRoundMatches[Math.floor(i / 2)]! : null
      const nextMatchSlot = nextMatch ? (i % 2 === 0 ? 1 : 2) : null

      // Handle byes: if one team is null, the other advances automatically
      const isBye = (m.team1Id === null) !== (m.team2Id === null)
      const bothNull = m.team1Id === null && m.team2Id === null

      if (bothNull) {
        // No teams yet (future round, not played)
        matchDefs.push({
          id: m.id,
          phaseId,
          poolId: null,
          team1Id: null,
          team2Id: null,
          winnerId: null,
          status: 'pending',
          court: null,
          scheduledAt: null,
          round: r,
          bracketPosition: m.bracketPosition,
          nextMatchId: nextMatch?.id ?? null,
          nextMatchSlot
        })
        continue
      }

      if (isBye) {
        // Bye: the present team advances
        const winnerId = m.team1Id ?? m.team2Id
        matchDefs.push({
          id: m.id,
          phaseId,
          poolId: null,
          team1Id: m.team1Id,
          team2Id: m.team2Id,
          winnerId,
          status: 'completed',
          court: null,
          scheduledAt: null,
          round: r,
          bracketPosition: m.bracketPosition,
          nextMatchId: nextMatch?.id ?? null,
          nextMatchSlot
        })
        // Propagate winner to next round
        if (nextMatch && nextMatchSlot) {
          if (nextMatchSlot === 1) nextMatch.team1Id = winnerId
          else nextMatch.team2Id = winnerId
        }
        continue
      }

      // Both teams present — decide if match is played based on completion rate
      const roundCompletionRate = r === 1 ? completionRate : (completionRate >= 1 ? 1 : Math.max(0, completionRate - (r - 1) * 0.3))
      const isCompleted = Math.random() < roundCompletionRate

      if (isCompleted) {
        const winnerIs1 = Math.random() < 0.5
        const winnerId = winnerIs1 ? m.team1Id! : m.team2Id!

        matchDefs.push({
          id: m.id,
          phaseId,
          poolId: null,
          team1Id: m.team1Id,
          team2Id: m.team2Id,
          winnerId,
          status: 'completed',
          court: courts[(r * 10 + i) % courts.length]!,
          scheduledAt: null,
          round: r,
          bracketPosition: m.bracketPosition,
          nextMatchId: nextMatch?.id ?? null,
          nextMatchSlot
        })

        const matchSets = generateMatchSets(winnerIs1)
        matchSets.forEach((s, sIdx) => {
          setDefs.push({
            id: uuid(),
            matchId: m.id,
            setNumber: sIdx + 1,
            score1: s.score1,
            score2: s.score2
          })
        })

        // Propagate winner
        if (nextMatch && nextMatchSlot) {
          if (nextMatchSlot === 1) nextMatch.team1Id = winnerId
          else nextMatch.team2Id = winnerId
        }
      } else {
        matchDefs.push({
          id: m.id,
          phaseId,
          poolId: null,
          team1Id: m.team1Id,
          team2Id: m.team2Id,
          winnerId: null,
          status: 'pending',
          court: courts[(r * 10 + i) % courts.length]!,
          scheduledAt: null,
          round: r,
          bracketPosition: m.bracketPosition,
          nextMatchId: nextMatch?.id ?? null,
          nextMatchSlot
        })
      }
    }
  }

  return { phaseDef, matchDefs, setDefs }
}

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

async function seed() {
  const startTime = Date.now()
  console.log('🌱 Starting seed...\n')

  // ---- 1. TRUNCATE CASCADE ----
  console.log('🗑️  Truncating all tables...')
  await db.execute(sql`TRUNCATE TABLE sets, matches, pool_entries, pools, phases, teams, categories, category_types, tournaments, users, clubs CASCADE`)

  // ---- 2. Clubs ----
  console.log('🏢 Inserting clubs...')
  await db.insert(clubs).values(
    CLUBS_DATA.map((c) => ({ id: c.id, name: c.name }))
  )

  // ---- 3. Users ----
  console.log('👥 Inserting users...')
  const clubIds = CLUBS_DATA.map((c) => c.id)
  const { admin, males, females } = generateUsers([...clubIds])

  const allUsers = [admin, ...males, ...females]
  await batchInsert(users, allUsers)
  console.log(`   ${allUsers.length} users (1 admin, ${males.length} males, ${females.length} females)`)

  // ---- 4. Category Types ----
  console.log('🏷️  Inserting category types...')
  await db.insert(categoryTypes).values(
    CATEGORY_TYPES_DATA.map((ct) => ({ id: ct.id, name: ct.name, type: ct.type, gender: ct.gender }))
  )

  // ---- 5. Tournaments ----
  console.log('🏆 Inserting tournaments...')
  const tournamentDefs = generateTournaments([...clubIds])
  await db.insert(tournaments).values(
    tournamentDefs.map((t) => ({
      id: t.id,
      name: t.name,
      clubId: t.clubId,
      date: t.date,
      location: t.location,
      status: t.status
    }))
  )

  // ---- 6. Categories (7 per tournament = 70) ----
  console.log('📋 Inserting categories...')
  interface CategoryDef { id: string; tournamentId: string; categoryTypeId: string; maxTeams: number; status: string }
  const allCategoryDefs: CategoryDef[] = []
  // Map: tournamentIndex → catConfigIndex → categoryId
  const categoryMap = new Map<string, Map<number, string>>()

  for (let ti = 0; ti < tournamentDefs.length; ti++) {
    const t = tournamentDefs[ti]!
    const catMap = new Map<number, string>()
    for (let ci = 0; ci < CATEGORY_CONFIGS.length; ci++) {
      const config = CATEGORY_CONFIGS[ci]!
      const catId = uuid()
      catMap.set(ci, catId)

      // Tournament 10 (index 9) is open for registration → status pending
      // Archived tournaments → status completed
      // In-progress (8,9) → status active
      let catStatus = 'pending'
      if (ti < 7) catStatus = 'completed'
      else if (ti === 8) catStatus = 'active'

      allCategoryDefs.push({
        id: catId,
        tournamentId: t.id,
        categoryTypeId: CATEGORY_TYPES_DATA[config.catTypeIndex]!.id,
        maxTeams: config.teamCount,
        status: catStatus
      })
    }
    categoryMap.set(t.id, catMap)
  }
  await batchInsert(categories, allCategoryDefs)

  // ---- 7-10. Teams, Phases, Pools, Matches, Sets per tournament ----
  const allTeamDefs: TeamDef[] = []
  const allPhaseDefs: PoolGenResult['phaseDef'][] = []
  const allPoolDefs: PoolGenResult['poolDefs'][number][] = []
  const allEntryDefs: PoolGenResult['entryDefs'][number][] = []
  const allMatchDefs: PoolGenResult['matchDefs'][number][] = []
  const allSetDefs: PoolGenResult['setDefs'][number][] = []

  for (let ti = 0; ti < tournamentDefs.length; ti++) {
    const t = tournamentDefs[ti]!
    const catMap = categoryMap.get(t.id)!
    const isTournament10 = ti === 9 // Open, no teams

    if (isTournament10) {
      console.log(`   Tournament ${ti + 1} (${t.name}): open — categories only`)
      continue
    }

    console.log(`   Tournament ${ti + 1} (${t.name}): generating teams...`)

    // Generate teams for each category
    const tournamentTeams = new Map<number, TeamDef[]>() // catConfigIndex → teams
    for (let ci = 0; ci < CATEGORY_CONFIGS.length; ci++) {
      const config = CATEGORY_CONFIGS[ci]!
      const categoryId = catMap.get(ci)!
      const teamDefs = assignTeams(t.id, categoryId, config, males, females)
      tournamentTeams.set(ci, teamDefs)
      allTeamDefs.push(...teamDefs)
    }

    // Tournaments 1-7 (archived): full pools + knockout phase
    if (ti < 7) {
      for (let ci = 0; ci < CATEGORY_CONFIGS.length; ci++) {
        const categoryId = catMap.get(ci)!
        const teamDefs = tournamentTeams.get(ci)!
        const poolResult = generatePoolPhase(categoryId, teamDefs, 1.0, 'completed')
        allPhaseDefs.push(poolResult.phaseDef)
        allPoolDefs.push(...poolResult.poolDefs)
        allEntryDefs.push(...poolResult.entryDefs)
        allMatchDefs.push(...poolResult.matchDefs)
        allSetDefs.push(...poolResult.setDefs)

        // Collect pool winners (rank 1 and 2) for knockout phase
        const qualifiedEntries = poolResult.entryDefs
          .filter((e) => e.finalRank !== null && e.finalRank <= 2)
          .sort((a, b) => (a.finalRank ?? 99) - (b.finalRank ?? 99))
        const qualifiedTeamIds = qualifiedEntries.map((e) => ({ teamId: e.teamId }))

        if (qualifiedTeamIds.length >= 2) {
          const koResult = generateKnockoutPhase(categoryId, qualifiedTeamIds, 1.0, 'completed', 2)
          allPhaseDefs.push(koResult.phaseDef)
          allMatchDefs.push(...koResult.matchDefs)
          allSetDefs.push(...koResult.setDefs)
        }
      }
    }

    // Tournament 8 (index 7): phases only, status pending, no pools
    if (ti === 7) {
      console.log(`   Tournament ${ti + 1}: phases created (pending), no pools`)
      for (let ci = 0; ci < CATEGORY_CONFIGS.length; ci++) {
        const config = CATEGORY_CONFIGS[ci]!
        const categoryId = catMap.get(ci)!
        allPhaseDefs.push({
          id: uuid(),
          categoryId,
          name: 'Poules',
          type: 'pool',
          phaseOrder: 1,
          config: { poolSize: 4, poolCount: Math.ceil(config.teamCount / 4) },
          status: 'pending'
        })
      }
    }

    // Tournament 9 (index 8): pools generated, ~60% matches completed
    if (ti === 8) {
      console.log(`   Tournament ${ti + 1}: pools with ~60% matches completed`)
      for (let ci = 0; ci < CATEGORY_CONFIGS.length; ci++) {
        const categoryId = catMap.get(ci)!
        const teamDefs = tournamentTeams.get(ci)!
        const result = generatePoolPhase(categoryId, teamDefs, 0.6, 'active')
        allPhaseDefs.push(result.phaseDef)
        allPoolDefs.push(...result.poolDefs)
        allEntryDefs.push(...result.entryDefs)
        allMatchDefs.push(...result.matchDefs)
        allSetDefs.push(...result.setDefs)
      }
    }
  }

  // ---- Batch inserts ----
  console.log('\n💾 Inserting teams...')
  await batchInsert(teams, allTeamDefs)
  console.log(`   ${allTeamDefs.length} teams`)

  console.log('💾 Inserting phases...')
  await batchInsert(phases, allPhaseDefs)
  console.log(`   ${allPhaseDefs.length} phases`)

  console.log('💾 Inserting pools...')
  await batchInsert(pools, allPoolDefs)
  console.log(`   ${allPoolDefs.length} pools`)

  console.log('💾 Inserting pool entries...')
  await batchInsert(poolEntries, allEntryDefs)
  console.log(`   ${allEntryDefs.length} pool entries`)

  console.log('💾 Inserting matches...')
  await batchInsert(matches, allMatchDefs)
  console.log(`   ${allMatchDefs.length} matches`)

  console.log('💾 Inserting sets...')
  await batchInsert(sets, allSetDefs)
  console.log(`   ${allSetDefs.length} sets`)

  // ---- Summary ----
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log('\n' + '═'.repeat(50))
  console.log('✅ Seed completed!')
  console.log('═'.repeat(50))
  console.log(`   Clubs:        ${CLUBS_DATA.length}`)
  console.log(`   Users:        ${allUsers.length}`)
  console.log(`   Cat. Types:   ${CATEGORY_TYPES_DATA.length}`)
  console.log(`   Tournaments:  ${tournamentDefs.length}`)
  console.log(`   Categories:   ${allCategoryDefs.length}`)
  console.log(`   Teams:        ${allTeamDefs.length}`)
  console.log(`   Phases:       ${allPhaseDefs.length}`)
  console.log(`   Pools:        ${allPoolDefs.length}`)
  console.log(`   Pool Entries: ${allEntryDefs.length}`)
  console.log(`   Matches:      ${allMatchDefs.length}`)
  console.log(`   Sets:         ${allSetDefs.length}`)
  const total = CLUBS_DATA.length + allUsers.length + CATEGORY_TYPES_DATA.length +
    tournamentDefs.length + allCategoryDefs.length + allTeamDefs.length +
    allPhaseDefs.length + allPoolDefs.length + allEntryDefs.length +
    allMatchDefs.length + allSetDefs.length
  console.log(`   TOTAL:        ${total} rows`)
  console.log(`   Time:         ${elapsed}s`)
  console.log(`\n   Admin login: admin@bsl.fr / password123`)

  await client.end()
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err)
  client.end().then(() => process.exit(1))
})
