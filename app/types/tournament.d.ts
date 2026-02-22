export interface MatchSet {
  id: string
  matchId: string
  setNumber: number
  score1: number
  score2: number
}

export interface PoolMatch {
  id: string
  phaseId: string
  poolId: string | null
  team1Id: string | null
  team2Id: string | null
  team1Name: string | null
  team2Name: string | null
  winnerId: string | null
  status: string
  court: string | null
  scheduledAt: string | null
  round: number | null
  bracketPosition: number | null
  sets: MatchSet[]
}

export interface KnockoutMatch {
  id: string
  phaseId: string
  team1Id: string | null
  team2Id: string | null
  team1Name: string | null
  team2Name: string | null
  winnerId: string | null
  status: string
  court: string | null
  scheduledAt: string | null
  round: number | null
  bracketPosition: number | null
  sets: MatchSet[]
}

export interface PoolEntry {
  id: string
  poolId: string
  teamId: string
  teamName: string
  finalRank: number | null
}

export interface TournamentPool {
  id: string
  phaseId: string
  name: string
  entries: PoolEntry[]
  matches: PoolMatch[]
}

export interface TournamentPhase {
  id: string
  categoryId: string
  name: string
  type: string
  phaseOrder: number
  status: string
  pools: TournamentPool[]
  knockoutMatches: KnockoutMatch[]
}

export interface TournamentCategory {
  id: string
  categoryTypeId: string
  maxTeams: number | null
  status: string
  typeName: string | null
  typeType: string | null
  typeGender: string | null
  phases: TournamentPhase[]
}

export interface TournamentStructure {
  categories: TournamentCategory[]
}

export interface PublicTournament {
  id: string
  name: string
  date: string | null
  location: string | null
  status: string
  clubName: string
}
