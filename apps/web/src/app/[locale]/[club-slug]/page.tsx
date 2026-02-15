import Link from "next/link";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import {
  getClubBySlug,
  listPublicTournaments,
  listCategoriesByTournament,
} from "@bsl-plume/db/queries";

export default async function ClubHomePage({
  params,
}: {
  params: Promise<{ locale: string; "club-slug": string }>;
}) {
  const { locale, "club-slug": clubSlug } = await params;
  setRequestLocale(locale);

  const club = await getClubBySlug(db, clubSlug);
  if (!club) notFound();

  const rawTournaments = await listPublicTournaments(db, club.id);

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

  return (
    <ClubHomeContent
      clubName={club.name}
      clubDescription={club.description}
      clubLocation={club.location}
      tournaments={tournaments}
      locale={locale}
      clubSlug={clubSlug}
    />
  );
}

function ClubHomeContent({
  clubName,
  clubDescription,
  clubLocation,
  tournaments,
  locale,
  clubSlug,
}: {
  clubName: string;
  clubDescription: string | null;
  clubLocation: string | null;
  tournaments: Array<{
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    status: string;
    location: string;
    categories: string[];
  }>;
  locale: string;
  clubSlug: string;
}) {
  const t = useTranslations();

  return (
    <div className="container mx-auto px-4 py-8">
      <section className="mb-12 text-center">
        <h1 className="text-4xl font-bold">{clubName}</h1>
        {clubDescription && (
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            {clubDescription}
          </p>
        )}
        {clubLocation && (
          <p className="mt-2 text-sm text-muted-foreground">{clubLocation}</p>
        )}
      </section>

      <section className="mb-12">
        <div className="grid gap-6 md:grid-cols-3">
          <FeatureCard
            title={t("home.features.realtime")}
            description={t("home.features.realtimeDesc")}
          />
          <FeatureCard
            title={t("home.features.registration")}
            description={t("home.features.registrationDesc")}
          />
          <FeatureCard
            title={t("home.features.brackets")}
            description={t("home.features.bracketsDesc")}
          />
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{t("tournament.title")}</h2>
          <Link
            href={`/${locale}/${clubSlug}/tournois`}
            className="text-sm font-medium text-primary hover:underline"
          >
            {t("tournament.viewDetails")} &rarr;
          </Link>
        </div>

        {tournaments.length === 0 ? (
          <p className="mt-8 text-center text-muted-foreground">
            {t("tournament.noTournaments")}
          </p>
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((tournament) => (
              <Card key={tournament.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{tournament.name}</CardTitle>
                    <TournamentBadge status={tournament.status} />
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
                      href={`/${locale}/${clubSlug}/tournois/${tournament.id}`}
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
      </section>
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function TournamentBadge({ status }: { status: string }) {
  const t = useTranslations("tournament.status");

  const variants: Record<
    string,
    "default" | "secondary" | "destructive" | "outline"
  > = {
    draft: "secondary",
    registration_open: "default",
    registration_closed: "outline",
    in_progress: "default",
    completed: "secondary",
    cancelled: "destructive",
  };

  return (
    <Badge variant={variants[status] ?? "secondary"}>{t(status)}</Badge>
  );
}
