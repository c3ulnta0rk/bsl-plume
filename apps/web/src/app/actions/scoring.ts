"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  getMatchById,
  updateMatchScore,
  updateMatchStatus,
  assignMatchCourt,
  assignCourtToMatch,
  releaseCourt,
  getAvailableCourts,
} from "@bsl-plume/db/queries";
import { requireSession } from "@/lib/session";
import { validateScore, calculateMatchResult } from "@bsl-plume/tournament-engine";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function submitScoreAction(
  matchId: string,
  sets: Array<{ score1: number; score2: number }>,
  clubSlug: string,
): Promise<ActionResult<{ winnerId: string }>> {
  await requireSession();

  const match = await getMatchById(db, matchId);
  if (!match) {
    return { success: false, error: "Match not found" };
  }

  if (!match.participant1Id || !match.participant2Id) {
    return { success: false, error: "Match participants not set" };
  }

  // Validate score using tournament engine
  const score = { sets };
  const validation = validateScore(score);
  if (!validation.valid) {
    return { success: false, error: validation.errors[0] ?? "Invalid score" };
  }

  // Calculate result
  const result = calculateMatchResult(
    match.participant1Id,
    match.participant2Id,
    score,
  );
  if (!result.success) {
    return { success: false, error: result.error };
  }

  await updateMatchScore(db, matchId, {
    scoreSet1P1: sets[0]?.score1 ?? null,
    scoreSet1P2: sets[0]?.score2 ?? null,
    scoreSet2P1: sets[1]?.score1 ?? null,
    scoreSet2P2: sets[1]?.score2 ?? null,
    scoreSet3P1: sets[2]?.score1 ?? null,
    scoreSet3P2: sets[2]?.score2 ?? null,
    winnerId: result.winnerId,
    status: "completed",
    endedAt: new Date(),
  });

  revalidatePath(`/${clubSlug}`);
  return { success: true, data: { winnerId: result.winnerId } };
}

export async function assignCourtAction(
  matchId: string,
  tournamentId: string,
  clubSlug: string,
): Promise<ActionResult<{ courtNumber: number }>> {
  await requireSession();

  const availableCourts = await getAvailableCourts(db, tournamentId);
  if (availableCourts.length === 0) {
    return { success: false, error: "No courts available" };
  }

  const court = availableCourts[0]!;

  await assignCourtToMatch(db, court.id, matchId);
  await assignMatchCourt(db, matchId, court.number);

  revalidatePath(`/${clubSlug}`);
  return { success: true, data: { courtNumber: court.number } };
}

export async function releaseCourtAction(
  courtId: string,
  clubSlug: string,
): Promise<ActionResult> {
  await requireSession();

  await releaseCourt(db, courtId);
  revalidatePath(`/${clubSlug}`);
  return { success: true, data: undefined };
}

export async function updateMatchStatusAction(
  matchId: string,
  status: string,
  clubSlug: string,
): Promise<ActionResult> {
  await requireSession();

  await updateMatchStatus(db, matchId, status);
  revalidatePath(`/${clubSlug}`);
  return { success: true, data: undefined };
}
