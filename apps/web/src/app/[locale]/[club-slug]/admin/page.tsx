import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import {
  getClubBySlug,
  listTournamentsByClub,
  listCategoriesByTournament,
  countRegistrationsByCategory,
} from "@bsl-plume/db/queries";

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string; "club-slug": string }>;
}) {
  const { locale, "club-slug": clubSlug } = await params;
  setRequestLocale(locale);

  const club = await getClubBySlug(db, clubSlug);
  if (!club) notFound();

  const tournaments = await listTournamentsByClub(db, club.id);

  const activeTournaments = tournaments.filter(
    (t) => t.status === "in_progress" || t.status === "registration_open",
  );

  // Count total registrations across all active tournaments
  let totalRegistrations = 0;
  for (const tournament of activeTournaments) {
    const categories = await listCategoriesByTournament(db, tournament.id);
    for (const cat of categories) {
      const [countResult] = await countRegistrationsByCategory(db, cat.id);
      totalRegistrations += countResult?.count ?? 0;
    }
  }

  return (
    <AdminDashboard
      locale={locale}
      clubSlug={clubSlug}
      tournamentCount={tournaments.length}
      activeTournamentCount={activeTournaments.length}
      totalRegistrations={totalRegistrations}
      recentTournaments={tournaments.slice(0, 5).map((t) => ({
        id: t.id,
        name: t.name,
        status: t.status,
        startDate: t.startDate.toLocaleDateString(locale, {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
      }))}
    />
  );
}

function AdminDashboard({
  locale,
  clubSlug,
  tournamentCount,
  activeTournamentCount,
  totalRegistrations,
  recentTournaments,
}: {
  locale: string;
  clubSlug: string;
  tournamentCount: number;
  activeTournamentCount: number;
  totalRegistrations: number;
  recentTournaments: Array<{
    id: string;
    name: string;
    status: string;
    startDate: string;
  }>;
}) {
  const t = useTranslations();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold">{t("admin.dashboard")}</h1>

      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link href={`/${locale}/${clubSlug}/admin/tournois`}>
          <Card className="transition-colors hover:bg-accent">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("admin.tournaments")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{tournamentCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {activeTournamentCount} {t("tournament.status.in_progress").toLowerCase()}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("admin.tournamentDetail.totalRegistrations")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalRegistrations}</p>
          </CardContent>
        </Card>

        <Link href={`/${locale}/${clubSlug}/admin/tournois/nouveau`}>
          <Card className="transition-colors hover:bg-accent">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("tournament.create.title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">+</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {recentTournaments.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-xl font-semibold">
            {t("admin.tournaments")}
          </h2>
          <div className="space-y-3">
            {recentTournaments.map((tournament) => (
              <Link
                key={tournament.id}
                href={`/${locale}/${clubSlug}/admin/tournois/${tournament.id}`}
              >
                <Card className="transition-colors hover:bg-accent">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{tournament.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {tournament.startDate}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {t(`tournament.status.${tournament.status}`)}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
