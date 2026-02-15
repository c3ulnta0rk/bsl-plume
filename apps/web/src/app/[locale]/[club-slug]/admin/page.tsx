import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import { getClubBySlug, listTournamentsByClub } from "@bsl-plume/db/queries";

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string; "club-slug": string }>;
}) {
  const { locale, "club-slug": clubSlug } = await params;
  setRequestLocale(locale);

  const club = await getClubBySlug(db, clubSlug);
  const tournaments = club
    ? await listTournamentsByClub(db, club.id)
    : [];

  return (
    <AdminDashboard
      clubSlug={clubSlug}
      tournamentCount={tournaments.length}
    />
  );
}

function AdminDashboard({
  clubSlug,
  tournamentCount,
}: {
  clubSlug: string;
  tournamentCount: number;
}) {
  const t = useTranslations("admin");

  const adminCards = [
    {
      title: t("tournaments"),
      href: `/${clubSlug}/admin/tournois`,
      count: tournamentCount,
    },
    {
      title: t("players"),
      href: `/${clubSlug}/admin/joueurs`,
      count: 0,
    },
    {
      title: t("courts"),
      href: `/${clubSlug}/admin/terrains`,
      count: 0,
    },
    {
      title: t("scoring"),
      href: `/${clubSlug}/admin/scores`,
      count: 0,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold">{t("dashboard")}</h1>

      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {adminCards.map((card) => (
          <Link key={card.href} href={card.href}>
            <Card className="transition-colors hover:bg-accent">
              <CardHeader>
                <CardTitle className="text-lg">{card.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{card.count}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
