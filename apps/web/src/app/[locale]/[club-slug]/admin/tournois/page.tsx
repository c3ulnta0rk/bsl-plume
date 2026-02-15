import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AdminTournamentsPage({
  params,
}: {
  params: Promise<{ locale: string; "club-slug": string }>;
}) {
  const { locale, "club-slug": clubSlug } = await params;
  setRequestLocale(locale);

  // TODO: Fetch tournaments from DB
  return <AdminTournaments clubSlug={clubSlug} />;
}

function AdminTournaments({ clubSlug }: { clubSlug: string }) {
  const t = useTranslations();

  // Placeholder data
  const tournaments: Array<{
    id: string;
    name: string;
    status: string;
    startDate: string;
  }> = [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("admin.tournaments")}</h1>
        <Link href={`/${clubSlug}/admin/tournois/nouveau`}>
          <Button>{t("tournament.create.title")}</Button>
        </Link>
      </div>

      {tournaments.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-muted-foreground">
            {t("tournament.noTournaments")}
          </p>
          <Link href={`/${clubSlug}/admin/tournois/nouveau`}>
            <Button className="mt-4">{t("tournament.create.title")}</Button>
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {tournaments.map((tournament) => (
            <Card key={tournament.id}>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-lg">{tournament.name}</CardTitle>
                <Badge variant="secondary">
                  {t(`tournament.status.${tournament.status}`)}
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {tournament.startDate}
                </p>
                <div className="mt-3 flex gap-2">
                  <Link href={`/${clubSlug}/admin/tournois/${tournament.id}`}>
                    <Button variant="outline" size="sm">
                      {t("tournament.manage")}
                    </Button>
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
