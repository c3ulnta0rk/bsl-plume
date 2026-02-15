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

export default async function TournamentsPage({
  params,
}: {
  params: Promise<{ locale: string; "club-slug": string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // TODO: Fetch tournaments from DB
  return <TournamentsContent />;
}

function TournamentsContent() {
  const t = useTranslations();

  // Placeholder data until DB is connected
  const tournaments = [
    {
      id: "1",
      name: "Open de Rimouski 2026",
      startDate: "2026-04-15",
      endDate: "2026-04-16",
      status: "registration_open" as const,
      location: "Centre sportif de Rimouski",
      categories: ["SH", "SD", "DH", "DD", "DX"],
    },
  ];

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
