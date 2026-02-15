"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  getRegistration,
  createRegistration as dbCreateRegistration,
  deleteRegistration as dbDeleteRegistration,
  countRegistrationsByCategory,
} from "@bsl-plume/db/queries";
import {
  getCategoryById,
  getPlayerByUserId,
  getTournamentById,
} from "@bsl-plume/db/queries";
import { requireSession } from "@/lib/session";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function registerForCategoryAction(
  categoryId: string,
  clubSlug: string,
  partnerId?: string,
  partnerEmail?: string,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();

  const player = await getPlayerByUserId(db, session.user.id);
  if (!player) {
    return { success: false, error: "Player profile not found" };
  }

  const category = await getCategoryById(db, categoryId);
  if (!category) {
    return { success: false, error: "Category not found" };
  }

  const tournament = await getTournamentById(db, category.tournamentId);
  if (!tournament || tournament.status !== "registration_open") {
    return { success: false, error: "Registration is closed" };
  }

  // Check if already registered
  const existing = await getRegistration(db, player.id, categoryId);
  if (existing) {
    return { success: false, error: "Already registered for this category" };
  }

  // Check capacity
  const [countResult] = await countRegistrationsByCategory(db, categoryId);
  if (countResult && countResult.count >= category.maxPlayers) {
    return { success: false, error: "Category is full" };
  }

  const [registration] = await dbCreateRegistration(db, {
    playerId: player.id,
    categoryId,
    partnerId: partnerId ?? null,
    partnerEmail: partnerEmail ?? null,
    status: "confirmed",
  });

  if (!registration) {
    return { success: false, error: "Failed to register" };
  }

  revalidatePath(`/${clubSlug}/tournois`);
  return { success: true, data: { id: registration.id } };
}

export async function withdrawRegistrationAction(
  registrationId: string,
  clubSlug: string,
): Promise<ActionResult> {
  const session = await requireSession();

  const player = await getPlayerByUserId(db, session.user.id);
  if (!player) {
    return { success: false, error: "Player profile not found" };
  }

  await dbDeleteRegistration(db, registrationId);
  revalidatePath(`/${clubSlug}/tournois`);
  return { success: true, data: undefined };
}
