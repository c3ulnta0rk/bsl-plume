import { db } from '@nuxthub/db'
import { eq, inArray } from 'drizzle-orm'
import { categories, categoryTypes } from '../db/schema/categories'
import { phases } from '../db/schema/rounds'
import { pools } from '../db/schema/pools'
import { poolEntries } from '../db/schema/poolEntries'
import { matches } from '../db/schema/matchs'
import { sets } from '../db/schema/sets'
import { teams } from '../db/schema/teams'

export async function getTournamentStructure(tournamentId: string) {
  // 1. Categories with type info
  const cats = await db.select({
    id: categories.id,
    categoryTypeId: categories.categoryTypeId,
    maxTeams: categories.maxTeams,
    status: categories.status,
    typeName: categoryTypes.name,
    typeType: categoryTypes.type,
    typeGender: categoryTypes.gender
  })
    .from(categories)
    .leftJoin(categoryTypes, eq(categories.categoryTypeId, categoryTypes.id))
    .where(eq(categories.tournamentId, tournamentId))

  const categoryIds = cats.map(c => c.id)
  if (categoryIds.length === 0) return { categories: [] }

  // 2. Phases for all categories
  const allPhases = await db.select().from(phases)
    .where(inArray(phases.categoryId, categoryIds))

  const phaseIds = allPhases.map(p => p.id)

  // 3. Parallel fetch: pools, matches, teams
  const [allPools, allMatches, allTeams] = await Promise.all([
    phaseIds.length > 0
      ? db.select().from(pools).where(inArray(pools.phaseId, phaseIds))
      : Promise.resolve([]),
    phaseIds.length > 0
      ? db.select().from(matches).where(inArray(matches.phaseId, phaseIds))
      : Promise.resolve([]),
    db.select().from(teams).where(eq(teams.tournamentId, tournamentId))
  ])

  const poolIds = allPools.map(p => p.id)
  const matchIds = allMatches.map(m => m.id)

  // 4. Parallel fetch: pool entries, sets
  const [allEntries, allSets] = await Promise.all([
    poolIds.length > 0
      ? db.select().from(poolEntries).where(inArray(poolEntries.poolId, poolIds))
      : Promise.resolve([]),
    matchIds.length > 0
      ? db.select().from(sets).where(inArray(sets.matchId, matchIds))
      : Promise.resolve([])
  ])

  // 5. Build lookup maps
  const teamMap = new Map(allTeams.map(t => [t.id, t]))

  const setsByMatch = new Map<string, typeof allSets>()
  for (const s of allSets) {
    const arr = setsByMatch.get(s.matchId) ?? []
    arr.push(s)
    setsByMatch.set(s.matchId, arr)
  }

  // 6. Assemble response
  return {
    categories: cats.map(cat => {
      const catPhases = allPhases
        .filter(p => p.categoryId === cat.id)
        .sort((a, b) => a.phaseOrder - b.phaseOrder)

      return {
        ...cat,
        phases: catPhases.map(phase => {
          const phasePools = allPools
            .filter(p => p.phaseId === phase.id)
            .sort((a, b) => a.name.localeCompare(b.name))

          const phaseMatches = allMatches.filter(m => m.phaseId === phase.id)

          return {
            ...phase,
            pools: phasePools.map(pool => {
              const entries = allEntries
                .filter(e => e.poolId === pool.id)
                .map(e => ({
                  ...e,
                  teamName: teamMap.get(e.teamId)?.name ?? '?'
                }))
                .sort((a, b) => (a.finalRank ?? 99) - (b.finalRank ?? 99))

              const poolMatches = phaseMatches
                .filter(m => m.poolId === pool.id)
                .map(m => ({
                  ...m,
                  team1Name: m.team1Id ? teamMap.get(m.team1Id)?.name ?? '?' : null,
                  team2Name: m.team2Id ? teamMap.get(m.team2Id)?.name ?? '?' : null,
                  sets: (setsByMatch.get(m.id) ?? []).sort((a, b) => a.setNumber - b.setNumber)
                }))

              return { ...pool, entries, matches: poolMatches }
            }),
            knockoutMatches: phaseMatches
              .filter(m => !m.poolId)
              .map(m => ({
                ...m,
                team1Name: m.team1Id ? teamMap.get(m.team1Id)?.name ?? '?' : null,
                team2Name: m.team2Id ? teamMap.get(m.team2Id)?.name ?? '?' : null,
                sets: (setsByMatch.get(m.id) ?? []).sort((a, b) => a.setNumber - b.setNumber)
              }))
              .sort((a, b) => (a.round ?? 0) - (b.round ?? 0) || (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0))
          }
        })
      }
    })
  }
}
