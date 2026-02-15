import { setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { getPlayerByUserId } from "@bsl-plume/db/queries";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { PlayerProfileForm } from "./player-profile-form";

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ locale: string; "club-slug": string }>;
}) {
  const { locale, "club-slug": clubSlug } = await params;
  setRequestLocale(locale);

  const session = await getSession();
  if (!session) {
    redirect(`/${locale}/auth/connexion`);
  }

  const player = await getPlayerByUserId(db, session.user.id);

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <PlayerProfileForm
        clubSlug={clubSlug}
        existingProfile={
          player
            ? {
                id: player.id,
                firstName: player.firstName,
                lastName: player.lastName,
                birthDate: player.birthDate?.toISOString().split("T")[0] ?? "",
                club: player.club,
                licenseNumber: player.licenseNumber,
              }
            : null
        }
      />
    </div>
  );
}
