import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { db } from "@/lib/db";
import {
  getClubBySlug,
  listPublicTournaments,
  listCategoriesByTournament,
} from "@bsl-plume/db/queries";

export default async function TournamentsPage({
  params,
}: {
  params: Promise<{ locale: string; "club-slug": string }>;
}) {
  const { locale, "club-slug": clubSlug } = await params;
  setRequestLocale(locale);

  const club = await getClubBySlug(db, clubSlug);
  const rawTournaments = club
    ? await listPublicTournaments(db, club.id)
    : [];

  const tournaments = await Promise.all(
    rawTournaments.map(async (t) => {
      const categories = await listCategoriesByTournament(db, t.id);
      return {
        id: t.id,
        name: t.name,
        startDate: t.startDate.toLocaleDateString(locale, {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        endDate: t.endDate.toLocaleDateString(locale, {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        status: t.status,
        location: t.location ?? "",
        categories: categories.map((c) => c.type),
      };
    }),
  );

  return <TournamentsContent tournaments={tournaments} />;
}

function TournamentsContent({
  tournaments,
}: {
  tournaments: Array<{
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    status: string;
    location: string;
    categories: string[];
  }>;
}) {
  const t = useTranslations();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold">{t("tournament.title")}</h1>

      {tournaments.length === 0 ? (
        <p className="mt-8 text-center text-muted-foreground">
          {t("tournament.noTournaments")}
        </p>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((tournament) => (
            <Card key={tournament.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{tournament.name}</CardTitle>
                  <TournamentStatusBadge status={tournament.status} />
                </div>
                <CardDescription>{tournament.location}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {tournament.startDate} — {tournament.endDate}
                </p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {tournament.categories.map((cat) => (
                    <Badge key={cat} variant="secondary" className="text-xs">
                      {t(`category.${cat}`)}
                    </Badge>
                  ))}
                </div>
                <div className="mt-4">
                  <Link
                    href={`tournois/${tournament.id}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {t("tournament.viewDetails")} &rarr;
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function TournamentStatusBadge({
  status,
}: {
  status: string;
}) {
  const t = useTranslations("tournament.status");

  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    draft: "secondary",
    registration_open: "default",
    registration_closed: "outline",
    in_progress: "default",
    completed: "secondary",
    cancelled: "destructive",
  };

  return (
    <Badge variant={variants[status] ?? "secondary"}>
      {t(status)}
    </Badge>
  );
}
