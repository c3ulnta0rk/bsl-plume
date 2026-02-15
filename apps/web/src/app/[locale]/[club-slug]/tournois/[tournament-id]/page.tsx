import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{
    locale: string;
    "club-slug": string;
    "tournament-id": string;
  }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // TODO: Fetch tournament from DB
  return <TournamentDetail />;
}

function TournamentDetail() {
  const t = useTranslations();

  // Placeholder data
  const tournament = {
    name: "Open de Rimouski 2026",
    status: "registration_open",
    location: "Centre sportif de Rimouski",
    startDate: "15 avril 2026",
    endDate: "16 avril 2026",
    categories: [
      { type: "SH", registeredCount: 12, maxPlayers: 32 },
      { type: "SD", registeredCount: 8, maxPlayers: 32 },
      { type: "DH", registeredCount: 6, maxPlayers: 16 },
      { type: "DD", registeredCount: 4, maxPlayers: 16 },
      { type: "DX", registeredCount: 10, maxPlayers: 16 },
    ],
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{tournament.name}</h1>
          <p className="mt-1 text-muted-foreground">{tournament.location}</p>
          <p className="text-sm text-muted-foreground">
            {tournament.startDate} — {tournament.endDate}
          </p>
        </div>
        <Badge variant="default">
          {t(`tournament.status.${tournament.status}`)}
        </Badge>
      </div>

      <Separator className="my-6" />

      <Tabs defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories">
            {t("tournament.fields.categories")}
          </TabsTrigger>
          <TabsTrigger value="pools">{t("pool.title")}</TabsTrigger>
          <TabsTrigger value="bracket">{t("bracket.title")}</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tournament.categories.map((cat) => (
              <Card key={cat.type}>
                <CardHeader>
                  <CardTitle>{t(`category.${cat.type}`)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {cat.registeredCount} / {cat.maxPlayers}{" "}
                    {t("category.maxPlayers").toLowerCase()}
                  </p>
                  <div className="mt-2 h-2 rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{
                        width: `${Math.min(100, (cat.registeredCount / cat.maxPlayers) * 100)}%`,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pools" className="mt-6">
          <PoolsView />
        </TabsContent>

        <TabsContent value="bracket" className="mt-6">
          <BracketView />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PoolsView() {
  const t = useTranslations();

  // Placeholder pool data
  const pools = [
    {
      name: "A",
      entries: [
        { name: "Tremblay, M.", wins: 2, losses: 0, pf: 84, pa: 56, diff: 28 },
        { name: "Gagnon, S.", wins: 1, losses: 1, pf: 70, pa: 65, diff: 5 },
        { name: "Roy, J.", wins: 0, losses: 2, pf: 48, pa: 81, diff: -33 },
      ],
    },
    {
      name: "B",
      entries: [
        { name: "Côté, A.", wins: 2, losses: 0, pf: 88, pa: 50, diff: 38 },
        { name: "Bouchard, L.", wins: 1, losses: 1, pf: 72, pa: 68, diff: 4 },
        { name: "Pelletier, D.", wins: 0, losses: 2, pf: 40, pa: 82, diff: -42 },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {pools.map((pool) => (
        <Card key={pool.name}>
          <CardHeader>
            <CardTitle>
              {t("pool.title")} {pool.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">{t("pool.ranking")}</th>
                    <th className="pb-2 text-center font-medium">
                      {t("pool.wins")}
                    </th>
                    <th className="pb-2 text-center font-medium">
                      {t("pool.losses")}
                    </th>
                    <th className="pb-2 text-center font-medium">
                      {t("pool.pointsFor")}
                    </th>
                    <th className="pb-2 text-center font-medium">
                      {t("pool.pointsAgainst")}
                    </th>
                    <th className="pb-2 text-center font-medium">
                      {t("pool.diff")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pool.entries.map((entry, index) => (
                    <tr key={entry.name} className="border-b last:border-0">
                      <td className="py-2">
                        <span className="mr-2 text-muted-foreground">
                          {index + 1}.
                        </span>
                        {entry.name}
                      </td>
                      <td className="py-2 text-center">{entry.wins}</td>
                      <td className="py-2 text-center">{entry.losses}</td>
                      <td className="py-2 text-center">{entry.pf}</td>
                      <td className="py-2 text-center">{entry.pa}</td>
                      <td className="py-2 text-center">
                        <span
                          className={
                            entry.diff > 0
                              ? "text-green-600 dark:text-green-400"
                              : entry.diff < 0
                                ? "text-red-600 dark:text-red-400"
                                : ""
                          }
                        >
                          {entry.diff > 0 ? "+" : ""}
                          {entry.diff}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function BracketView() {
  const t = useTranslations();

  // Placeholder bracket data
  const rounds = [
    {
      name: t("bracket.quarterfinals"),
      matches: [
        { p1: "Tremblay, M.", p2: "Pelletier, D.", score: "21-15, 21-12", winner: 1 },
        { p1: "Côté, A.", p2: "Gagnon, S.", score: "21-18, 21-16", winner: 1 },
        { p1: "Bouchard, L.", p2: "Roy, J.", score: null, winner: null },
        { p1: "TBD", p2: "TBD", score: null, winner: null },
      ],
    },
    {
      name: t("bracket.semifinals"),
      matches: [
        { p1: "Tremblay, M.", p2: "Côté, A.", score: null, winner: null },
        { p1: "TBD", p2: "TBD", score: null, winner: null },
      ],
    },
    {
      name: t("bracket.finals"),
      matches: [
        { p1: "TBD", p2: "TBD", score: null, winner: null },
      ],
    },
  ];

  return (
    <div className="space-y-8">
      {rounds.map((round) => (
        <div key={round.name}>
          <h3 className="mb-4 text-lg font-semibold">{round.name}</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {round.matches.map((match, index) => (
              <Card
                key={`${round.name}-${index}`}
                className={match.score ? "border-primary/20" : ""}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p
                        className={`text-sm ${
                          match.winner === 1 ? "font-bold" : ""
                        }`}
                      >
                        {match.p1}
                      </p>
                      <p
                        className={`text-sm ${
                          match.winner === 2 ? "font-bold" : ""
                        }`}
                      >
                        {match.p2}
                      </p>
                    </div>
                    {match.score ? (
                      <Badge variant="secondary" className="text-xs">
                        {match.score}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {t("match.status.scheduled")}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
