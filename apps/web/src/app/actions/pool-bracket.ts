"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  listRegistrationsByCategory,
  listPoolsByCategory,
  listPoolEntries,
  createPools,
  createPoolEntries,
  createBracket,
  createMatches,
  getCategoryById,
  getClubMembership,
} from "@bsl-plume/db/queries";
import { requireSession } from "@/lib/session";
import { generatePools, generateBracket } from "@bsl-plume/tournament-engine";
import type { Participant } from "@bsl-plume/tournament-engine";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function generatePoolsAction(
  categoryId: string,
  poolCount: number,
  clubSlug: string,
  clubId: string,
): Promise<ActionResult> {
  const user = await requireSession();

  const membership = await getClubMembership(db, user.id, clubId);
  if (!membership || membership.role !== "admin") {
    return { success: false, error: "Unauthorized" };
  }

  const registrations = await listRegistrationsByCategory(db, categoryId);
  const confirmed = registrations.filter((r) => r.status === "confirmed");

  if (confirmed.length < 3) {
    return {
      success: false,
      error: "Need at least 3 confirmed registrations",
    };
  }

  const participants: Participant[] = confirmed.map((r) => ({
    id: r.playerId,
  }));

  const poolsResult = generatePools(participants, poolCount);

  // Save pools to DB
  const dbPools = await createPools(
    db,
    poolsResult.map((pool) => ({
      categoryId,
      name: pool.name,
      size: pool.entries.length,
      status: "active",
    })),
  );

  // Save pool entries and matches
  for (let i = 0; i < dbPools.length; i++) {
    const pool = dbPools[i]!;
    const enginePool = poolsResult[i]!;

    await createPoolEntries(
      db,
      enginePool.entries.map((entry) => ({
        poolId: pool.id,
        playerId: entry.participant.id,
      })),
    );

    if (enginePool.matches.length > 0) {
      await createMatches(
        db,
        enginePool.matches.map((match, idx) => ({
          poolId: pool.id,
          round: 1,
          position: idx,
          participant1Id: match.participant1?.id ?? null,
          participant2Id: match.participant2?.id ?? null,
          status: "scheduled",
        })),
      );
    }
  }

  revalidatePath(`/${clubSlug}`);
  return { success: true, data: undefined };
}

export async function generateBracketAction(
  categoryId: string,
  clubSlug: string,
  clubId: string,
): Promise<ActionResult> {
  const user = await requireSession();

  const membership = await getClubMembership(db, user.id, clubId);
  if (!membership || membership.role !== "admin") {
    return { success: false, error: "Unauthorized" };
  }

  const pools = await listPoolsByCategory(db, categoryId);
  if (pools.length === 0) {
    return { success: false, error: "No pools found for this category" };
  }

  const category = await getCategoryById(db, categoryId);
  if (!category) {
    return { success: false, error: "Category not found" };
  }

  // Gather qualified players from pool rankings
  const qualifiedPlayerIds: string[] = [];
  for (const pool of pools) {
    const entries = await listPoolEntries(db, pool.id);
    const ranked = entries.slice().sort((a, b) => {
      if (a.rank !== null && b.rank !== null) return a.rank - b.rank;
      return (b.wins - b.losses) - (a.wins - a.losses);
    });

    // Top 2 from each pool qualify
    if (ranked[0]) qualifiedPlayerIds.push(ranked[0].playerId);
    if (ranked[1]) qualifiedPlayerIds.push(ranked[1].playerId);
  }

  if (qualifiedPlayerIds.length < 2) {
    return {
      success: false,
      error: "Not enough qualified players to generate bracket",
    };
  }

  const participants: Participant[] = qualifiedPlayerIds.map((id, idx) => ({
    id,
    seed: idx + 1,
  }));

  const bracketResult = generateBracket(participants);

  // Save bracket to DB
  const [dbBracket] = await createBracket(db, {
    categoryId,
    type: "main",
    roundCount: bracketResult.rounds,
    status: "active",
  });

  if (!dbBracket) {
    return { success: false, error: "Failed to create bracket" };
  }

  // Save bracket matches
  const allMatches = bracketResult.matches.map((match) => ({
    bracketId: dbBracket.id,
    round: match.round,
    position: match.position,
    participant1Id: match.participant1?.id ?? null,
    participant2Id: match.participant2?.id ?? null,
    status: match.status,
    nextMatchId: null as string | null,
  }));

  if (allMatches.length > 0) {
    await createMatches(db, allMatches);
  }

  revalidatePath(`/${clubSlug}`);
  return { success: true, data: undefined };
}
