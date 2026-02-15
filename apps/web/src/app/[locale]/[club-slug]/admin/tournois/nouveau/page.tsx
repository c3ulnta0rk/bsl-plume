import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getClubBySlug } from "@bsl-plume/db/queries";
import { db } from "@/lib/db";
import { CreateTournamentForm } from "./create-tournament-form";

export default async function NewTournamentPage({
  params,
}: {
  params: Promise<{ locale: string; "club-slug": string }>;
}) {
  const { locale, "club-slug": clubSlug } = await params;
  setRequestLocale(locale);

  const club = await getClubBySlug(db, clubSlug);
  if (!club) notFound();

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <CreateTournamentForm clubId={club.id} clubSlug={clubSlug} />
    </div>
  );
}
