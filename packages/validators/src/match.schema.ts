import { z } from "zod";

export const MATCH_STATUS = {
  SCHEDULED: "scheduled",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  WALKOVER: "walkover",
  RETIRED: "retired",
  DISQUALIFIED: "disqualified",
} as const;

export type MatchStatus =
  (typeof MATCH_STATUS)[keyof typeof MATCH_STATUS];

const setScoreSchema = z.object({
  score1: z.number().int().min(0).max(30),
  score2: z.number().int().min(0).max(30),
});

export const matchScoreSchema = z.object({
  sets: z.array(setScoreSchema).min(1).max(3),
});

export type MatchScore = z.infer<typeof matchScoreSchema>;
