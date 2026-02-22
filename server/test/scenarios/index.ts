import {
  createClub,
  createUser,
  createTournament,
  createCategoryType,
  createCategory,
  createTeam,
  createPhase,
  createPool,
  createPoolEntry,
  createMatch,
  createSet,
} from '../factories'

export async function createFullTournament() {
  const club = await createClub()
  const tournament = await createTournament({ clubId: club.id })

  const shType = await createCategoryType({ name: 'Simple Homme', type: 'singles', gender: 'M' })
  const dhType = await createCategoryType({ name: 'Double Homme', type: 'doubles', gender: 'M' })

  const shCategory = await createCategory({ tournamentId: tournament.id, categoryTypeId: shType.id, maxTeams: 8 })
  const dhCategory = await createCategory({ tournamentId: tournament.id, categoryTypeId: dhType.id, maxTeams: 8 })

  // 8 players for singles
  const singlesPlayers = await Promise.all(
    Array.from({ length: 8 }, () => createUser({ clubId: club.id }))
  )

  const singlesTeams = await Promise.all(
    singlesPlayers.map((p) =>
      createTeam({
        playerOneId: p.id,
        tournamentId: tournament.id,
        categoryId: shCategory.id,
        name: p.name,
      })
    )
  )

  // 8 players for doubles (4 teams of 2)
  const doublesPlayers = await Promise.all(
    Array.from({ length: 8 }, () => createUser({ clubId: club.id }))
  )

  const doublesTeams = await Promise.all(
    Array.from({ length: 4 }, (_, i) =>
      createTeam({
        playerOneId: doublesPlayers[i * 2]!.id,
        playerTwoId: doublesPlayers[i * 2 + 1]!.id,
        tournamentId: tournament.id,
        categoryId: dhCategory.id,
        name: `${doublesPlayers[i * 2]!.name} / ${doublesPlayers[i * 2 + 1]!.name}`,
      })
    )
  )

  // Pool phase + knockout phase for singles
  const singlesPoolPhase = await createPoolPhase({ categoryId: shCategory.id, teams: singlesTeams })
  const singlesKnockoutPhase = await createKnockoutPhase({
    categoryId: shCategory.id,
    teams: singlesTeams.slice(0, 4),
  })

  return {
    club,
    tournament,
    categoryTypes: { sh: shType, dh: dhType },
    categories: { sh: shCategory, dh: dhCategory },
    players: { singles: singlesPlayers, doubles: doublesPlayers },
    teams: { singles: singlesTeams, doubles: doublesTeams },
    phases: {
      singlesPool: singlesPoolPhase,
      singlesKnockout: singlesKnockoutPhase,
    },
  }
}

export async function createPoolPhase({ categoryId, teams }: { categoryId: string; teams: { id: string }[] }) {
  const phase = await createPhase({ categoryId, type: 'pool', name: 'Poules', phaseOrder: 1, config: {} })

  const poolCount = Math.ceil(teams.length / 4)
  const createdPools = await Promise.all(
    Array.from({ length: poolCount }, (_, i) =>
      createPool({ phaseId: phase.id, name: String.fromCharCode(65 + i) })
    )
  )

  const entries = await Promise.all(
    teams.map((team, i) =>
      createPoolEntry({ poolId: createdPools[i % poolCount]!.id, teamId: team.id })
    )
  )

  // Round-robin matches per pool
  const allMatches = []
  const allSets = []
  for (const pool of createdPools) {
    const poolTeams = entries.filter((e) => e.poolId === pool.id)
    for (let i = 0; i < poolTeams.length; i++) {
      for (let j = i + 1; j < poolTeams.length; j++) {
        const match = await createMatch({
          phaseId: phase.id,
          poolId: pool.id,
          team1Id: poolTeams[i]!.teamId,
          team2Id: poolTeams[j]!.teamId,
        })
        const set = await createSet({ matchId: match.id, setNumber: 1 })
        allMatches.push(match)
        allSets.push(set)
      }
    }
  }

  return { phase, pools: createdPools, entries, matches: allMatches, sets: allSets }
}

export async function createKnockoutPhase({ categoryId, teams }: { categoryId: string; teams: { id: string }[] }) {
  const phase = await createPhase({ categoryId, type: 'knockout', name: 'Elimination', phaseOrder: 2, config: {} })

  // Semi-finals
  const semis = await Promise.all(
    Array.from({ length: Math.floor(teams.length / 2) }, (_, i) =>
      createMatch({
        phaseId: phase.id,
        team1Id: teams[i * 2]!.id,
        team2Id: teams[i * 2 + 1]!.id,
        round: 1,
        bracketPosition: i + 1,
      })
    )
  )

  const semiSets = await Promise.all(
    semis.map((m) => createSet({ matchId: m.id, setNumber: 1 }))
  )

  // Final
  const final = await createMatch({
    phaseId: phase.id,
    round: 2,
    bracketPosition: 1,
  })
  const finalSet = await createSet({ matchId: final.id, setNumber: 1 })

  return {
    phase,
    matches: { semis, final },
    sets: { semis: semiSets, final: finalSet },
  }
}
