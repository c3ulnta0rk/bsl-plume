import { setRequestLocale } from "next-intl/server";
import { CreateTournamentForm } from "./create-tournament-form";

export default async function NewTournamentPage({
  params,
}: {
  params: Promise<{ locale: string; "club-slug": string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <CreateTournamentForm />
    </div>
  );
}
