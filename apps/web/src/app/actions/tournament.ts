"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  createTournament as dbCreateTournament,
  updateTournamentStatus as dbUpdateTournamentStatus,
  createCategories,
  getClubMembership,
} from "@bsl-plume/db/queries";
import { requireSession } from "@/lib/session";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function createTournamentAction(
  clubId: string,
  clubSlug: string,
  formData: {
    name: string;
    description: string | null;
    location: string | null;
    startDate: string;
    endDate: string;
    registrationStart: string;
    registrationEnd: string;
    courtCount: number;
    categories: Array<{ type: string; maxPlayers: number }>;
  },
): Promise<ActionResult<{ id: string }>> {
  const user = await requireSession();

  const membership = await getClubMembership(db, user.id, clubId);
  if (!membership || membership.role !== "admin") {
    return { success: false, error: "Unauthorized" };
  }

  const startDate = new Date(formData.startDate);
  const endDate = new Date(formData.endDate);
  const registrationStart = new Date(formData.registrationStart);
  const registrationEnd = new Date(formData.registrationEnd);

  if (endDate <= startDate) {
    return { success: false, error: "End date must be after start date" };
  }
  if (registrationEnd > startDate) {
    return {
      success: false,
      error: "Registration must end before tournament starts",
    };
  }

  const [tournament] = await dbCreateTournament(db, {
    clubId,
    name: formData.name,
    description: formData.description,
    location: formData.location,
    startDate,
    endDate,
    registrationStart,
    registrationEnd,
    settings: { courtCount: formData.courtCount },
  });

  if (!tournament) {
    return { success: false, error: "Failed to create tournament" };
  }

  if (formData.categories.length > 0) {
    await createCategories(
      db,
      formData.categories.map((cat) => ({
        tournamentId: tournament.id,
        type: cat.type,
        maxPlayers: cat.maxPlayers,
      })),
    );
  }

  revalidatePath(`/${clubSlug}/admin/tournois`);
  return { success: true, data: { id: tournament.id } };
}

export async function updateTournamentStatusAction(
  tournamentId: string,
  status: string,
  clubSlug: string,
  clubId: string,
): Promise<ActionResult> {
  const user = await requireSession();

  const membership = await getClubMembership(db, user.id, clubId);
  if (!membership || membership.role !== "admin") {
    return { success: false, error: "Unauthorized" };
  }

  await dbUpdateTournamentStatus(db, tournamentId, status);
  revalidatePath(`/${clubSlug}/admin/tournois`);
  return { success: true, data: undefined };
}
