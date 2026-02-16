"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  getPlayerByUserId,
  upsertPlayer,
} from "@bsl-plume/db/queries";
import { requireSession } from "@/lib/session";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function upsertPlayerProfileAction(
  clubSlug: string,
  formData: {
    firstName: string;
    lastName: string;
    birthDate: string;
    club: string | null;
    licenseNumber: string | null;
  },
): Promise<ActionResult<{ id: string }>> {
  const user = await requireSession();

  if (!formData.firstName.trim() || !formData.lastName.trim()) {
    return { success: false, error: "First name and last name are required" };
  }

  if (!formData.birthDate) {
    return { success: false, error: "Birth date is required" };
  }

  const [player] = await upsertPlayer(db, {
    userId: user.id,
    firstName: formData.firstName.trim(),
    lastName: formData.lastName.trim(),
    birthDate: new Date(formData.birthDate),
    club: formData.club?.trim() || null,
    licenseNumber: formData.licenseNumber?.trim() || null,
  });

  if (!player) {
    return { success: false, error: "Failed to save profile" };
  }

  revalidatePath(`/${clubSlug}/profil`);
  return { success: true, data: { id: player.id } };
}

export async function getPlayerProfileAction(): Promise<
  ActionResult<{
    id: string;
    firstName: string;
    lastName: string;
    birthDate: string;
    club: string | null;
    licenseNumber: string | null;
  } | null>
> {
  const user = await requireSession();

  const player = await getPlayerByUserId(db, user.id);

  if (!player) {
    return { success: true, data: null };
  }

  return {
    success: true,
    data: {
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      birthDate: player.birthDate?.toISOString().split("T")[0] ?? "",
      club: player.club,
      licenseNumber: player.licenseNumber,
    },
  };
}
