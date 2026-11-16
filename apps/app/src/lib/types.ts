import type { ScoringRules, StandingRow } from '@plume/engine'

export type Discipline = 'SH' | 'SD' | 'DH' | 'DD' | 'DX'
export type MatchStatus = 'pending' | 'called' | 'playing' | 'completed' | 'cancelled'
export type ResultKind = 'normal' | 'retired' | 'walkover' | 'bye'
export type TournamentStatus = 'draft' | 'published' | 'running' | 'finished'
export type RegistrationStatus = 'pending_email' | 'pending' | 'accepted' | 'waitlist' | 'refused' | 'withdrawn'

export interface CategoryFormat { type: 'pools_bracket' | 'pools' | 'bracket', poolSize: number, qualifiers: number, thirdPlace: boolean }

export interface Entry {
  id: string
  name: string
  players: { id: string, name: string, club: string | null }[]
  seed: number | null
  withdrawn: boolean
}

export interface Match {
  id: string
  categoryId: string
  phase: 'pool' | 'bracket'
  poolId: string | null
  round: number
  position: number
  number: number
  label: string
  entry1Id: string | null
  entry2Id: string | null
  placeholder1: string | null
  placeholder2: string | null
  status: MatchStatus
  courtId: string | null
  sets: { a: number, b: number }[]
  winnerSide: 1 | 2 | null
  resultType: ResultKind | null
  thirdPlace: boolean
  calledAt: number | null
  startedAt: number | null
  endedAt: number | null
  estimatedStart: number | null
  estimatedCourtId: string | null
  rulesText: string
}

export interface Category {
  id: string
  name: string
  discipline: Discipline
  level: string
  maxEntries: number
  position: number
  format: CategoryFormat
  poolRules: ScoringRules
  bracketRules: ScoringRules
  poolRulesText: string
  bracketRulesText: string
  status: 'registration' | 'drawn' | 'finished'
  counts: { accepted: number, pending: number, waitlist: number }
  entries: Entry[]
  pools: { id: string, name: string, complete: boolean, standings: StandingRow[] }[]
  bracketRounds: { round: number, name: string }[]
}

export interface TournamentSettings {
  restMinutes: number
  paymentInfo?: string
  contactEmail?: string
  registrationDeadline?: string | null
  startTime?: string | null
  pausedUntil?: string | null
  federation?: 'FFBaD' | 'BWF' | 'Libre'
}

export interface Tournament {
  id: string
  slug: string
  name: string
  clubName: string
  location: string
  startDate: string
  endDate: string | null
  description: string
  rulesText: string
  status: TournamentStatus
  registrationOpen: boolean
  settings: TournamentSettings
}

export interface Court { id: string, name: string, open: boolean, matchId: string | null }

export interface Snapshot {
  tournament: Tournament
  courts: Court[]
  categories: Category[]
  matches: Match[]
  serverTime: number
}

export interface TournamentCard {
  id: string
  slug: string
  name: string
  clubName: string
  location: string
  startDate: string
  endDate: string | null
  status: TournamentStatus
  registrationOpen: boolean
  entries: number
  places: number
  categories: number
}

export interface OrgRegistration {
  id: string
  categoryId: string
  status: RegistrationStatus
  source: 'online' | 'manual'
  seed: number | null
  email: string | null
  phone: string | null
  note: string | null
  organizerNote: string | null
  withdrawMode: 'annul' | 'walkover' | null
  createdAt: string
  player1: { id: string, name: string, club: string | null, licence: string | null } | null
  player2: { id: string, name: string, club: string | null, licence: string | null } | null
}

export interface Follow { playerId: string, name: string, club: string | null, isMe: boolean }
export interface Notice { id: string, title: string, body: string, url: string | null, createdAt: string, matchId: string | null }

export interface PlayerHistory {
  player: { id: string, name: string, club: string | null }
  stats: { played: number, won: number }
  tournaments: {
    slug: string
    name: string
    date: string
    location: string
    categories: {
      id: string
      name: string
      partner: string | null
      result: string
      matches: { id: string, label: string, opponent: string, won: boolean | null, sets: { a: number, b: number }[], resultType: string | null, status: string }[]
    }[]
  }[]
}
