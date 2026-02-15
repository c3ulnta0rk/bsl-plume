// --- Category Types ---

const CATEGORY_TYPES = {
  SH: "SH",
  SD: "SD",
  DH: "DH",
  DD: "DD",
  DX: "DX",
} as const;

type CategoryType = (typeof CATEGORY_TYPES)[keyof typeof CATEGORY_TYPES];

// --- Match Status ---

const MATCH_STATUSES = {
  SCHEDULED: "scheduled",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  WALKOVER: "walkover",
  RETIRED: "retired",
  DISQUALIFIED: "disqualified",
} as const;

type MatchStatus = (typeof MATCH_STATUSES)[keyof typeof MATCH_STATUSES];

// --- Court Status ---

const COURT_STATUSES = {
  AVAILABLE: "available",
  IN_USE: "in_use",
  CLOSED: "closed",
} as const;

type CourtStatus = (typeof COURT_STATUSES)[keyof typeof COURT_STATUSES];

// --- Score & Match ---

interface Set {
  score1: number;
  score2: number;
}

interface Score {
  sets: Set[];
}

interface Participant {
  id: string;
  seed?: number;
  clubId?: string;
}

interface Match {
  id: string;
  participant1: Participant | null;
  participant2: Participant | null;
  score: Score | null;
  status: MatchStatus;
  winnerId: string | null;
  courtNumber: number | null;
  round: number;
  position: number;
  scheduledTime: Date | null;
  startedAt: Date | null;
  endedAt: Date | null;
}

type MatchResult =
  | { success: true; winnerId: string; score: Score }
  | {
      success: false;
      error:
        | "INVALID_SCORE"
        | "MATCH_NOT_FOUND"
        | "ALREADY_COMPLETED"
        | "MISSING_PARTICIPANTS";
    };

// --- Pool ---

interface PoolEntry {
  participant: Participant;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  rank: number | null;
  isQualified: boolean;
}

interface Pool {
  id: string;
  name: string;
  entries: PoolEntry[];
  matches: Match[];
}

interface PoolRanking {
  participantId: string;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifferential: number;
  rank: number;
}

// --- Bracket ---

interface BracketMatch {
  id: string;
  round: number;
  position: number;
  participant1: Participant | null;
  participant2: Participant | null;
  score: Score | null;
  status: MatchStatus;
  winnerId: string | null;
  nextMatchId: string | null;
}

interface Bracket {
  id: string;
  rounds: number;
  matches: BracketMatch[];
}

// --- Court ---

interface Court {
  id: string;
  number: number;
  name: string;
  status: CourtStatus;
  currentMatchId: string | null;
}

export type {
  CategoryType,
  MatchStatus,
  CourtStatus,
  Set,
  Score,
  Participant,
  Match,
  MatchResult,
  PoolEntry,
  Pool,
  PoolRanking,
  BracketMatch,
  Bracket,
  Court,
};

export { CATEGORY_TYPES, MATCH_STATUSES, COURT_STATUSES };
