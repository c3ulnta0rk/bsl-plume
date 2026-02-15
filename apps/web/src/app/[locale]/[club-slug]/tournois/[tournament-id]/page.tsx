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
import { db } from "@/lib/db";
import {
  getTournamentById,
  listCategoriesByTournament,
  countRegistrationsByCategory,
  listPoolsByCategory,
  listPoolEntries,
  getBracketByCategory,
  listMatchesByBracket,
} from "@bsl-plume/db/queries";
import { getPlayerById } from "@bsl-plume/db/queries";
import { notFound } from "next/navigation";

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{
    locale: string;
    "club-slug": string;
    "tournament-id": string;
  }>;
}) {
  const { locale, "tournament-id": tournamentId } = await params;
  setRequestLocale(locale);

  const tournament = await getTournamentById(db, tournamentId);
  if (!tournament) {
    notFound();
  }

  const categories = await listCategoriesByTournament(db, tournament.id);

  const categoriesWithCount = await Promise.all(
    categories.map(async (cat) => {
      const [countResult] = await countRegistrationsByCategory(db, cat.id);
      return {
        id: cat.id,
        type: cat.type,
        maxPlayers: cat.maxPlayers,
        registeredCount: countResult?.count ?? 0,
      };
    }),
  );

  // Load pools for first category that has them
  const poolsData = await Promise.all(
    categories.map(async (cat) => {
      const pools = await listPoolsByCategory(db, cat.id);
      return Promise.all(
        pools.map(async (pool) => {
          const entries = await listPoolEntries(db, pool.id);

          const entriesWithNames = await Promise.all(
            entries.map(async (entry) => {
              const player = await getPlayerById(db, entry.playerId);
              return {
                name: player
                  ? `${player.lastName}, ${player.firstName.charAt(0)}.`
                  : entry.playerId.slice(0, 8),
                wins: entry.wins,
                losses: entry.losses,
                pf: entry.pointsFor,
                pa: entry.pointsAgainst,
                diff: entry.pointsFor - entry.pointsAgainst,
              };
            }),
          );

          return {
            name: pool.name,
            entries: entriesWithNames,
          };
        }),
      );
    }),
  );

  const allPools = poolsData.flat();

  // Load bracket data
  const bracketData = await Promise.all(
    categories.map(async (cat) => {
      const bracket = await getBracketByCategory(db, cat.id);
      if (!bracket) return null;
      const matches = await listMatchesByBracket(db, bracket.id);
      return { bracket, matches };
    }),
  );
  const activeBracket = bracketData.find((b) => b !== null);

  // Build bracket rounds for display
  const bracketRounds: Array<{
    name: string;
    matches: Array<{
      p1: string;
      p2: string;
      score: string | null;
      winner: number | null;
    }>;
  }> = [];

  if (activeBracket) {
    const roundGroups = new Map<number, typeof activeBracket.matches>();
    for (const match of activeBracket.matches) {
      const existing = roundGroups.get(match.round) ?? [];
      existing.push(match);
      roundGroups.set(match.round, existing);
    }

    const sortedRounds = [...roundGroups.entries()].sort(
      ([a], [b]) => a - b,
    );

    for (const [roundNum, roundMatches] of sortedRounds) {
      const roundName =
        roundMatches.length === 1
          ? "Finale"
          : roundMatches.length === 2
            ? "Demi-finales"
            : roundMatches.length === 4
              ? "Quarts de finale"
              : `Tour ${roundNum}`;

      bracketRounds.push({
        name: roundName,
        matches: await Promise.all(
          roundMatches.map(async (m) => {
            const p1 = m.participant1Id
              ? await getPlayerById(db, m.participant1Id)
              : null;
            const p2 = m.participant2Id
              ? await getPlayerById(db, m.participant2Id)
              : null;

            const score = m.status === "completed" && m.scoreSet1P1 !== null
              ? formatScore(m)
              : null;

            return {
              p1: p1
                ? `${p1.lastName}, ${p1.firstName.charAt(0)}.`
                : "TBD",
              p2: p2
                ? `${p2.lastName}, ${p2.firstName.charAt(0)}.`
                : "TBD",
              score,
              winner:
                m.winnerId === m.participant1Id
                  ? 1
                  : m.winnerId === m.participant2Id
                    ? 2
                    : null,
            };
          }),
        ),
      });
    }
  }

  return (
    <TournamentDetail
      tournament={{
        name: tournament.name,
        status: tournament.status,
        location: tournament.location ?? "",
        startDate: tournament.startDate.toLocaleDateString(locale, {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        endDate: tournament.endDate.toLocaleDateString(locale, {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        categories: categoriesWithCount,
      }}
      pools={allPools}
      bracketRounds={bracketRounds}
    />
  );
}

function formatScore(m: {
  scoreSet1P1: number | null;
  scoreSet1P2: number | null;
  scoreSet2P1: number | null;
  scoreSet2P2: number | null;
  scoreSet3P1: number | null;
  scoreSet3P2: number | null;
}): string {
  const sets: string[] = [];
  if (m.scoreSet1P1 !== null && m.scoreSet1P2 !== null) {
    sets.push(`${m.scoreSet1P1}-${m.scoreSet1P2}`);
  }
  if (m.scoreSet2P1 !== null && m.scoreSet2P2 !== null) {
    sets.push(`${m.scoreSet2P1}-${m.scoreSet2P2}`);
  }
  if (m.scoreSet3P1 !== null && m.scoreSet3P2 !== null) {
    sets.push(`${m.scoreSet3P1}-${m.scoreSet3P2}`);
  }
  return sets.join(", ");
}

function TournamentDetail({
  tournament,
  pools,
  bracketRounds,
}: {
  tournament: {
    name: string;
    status: string;
    location: string;
    startDate: string;
    endDate: string;
    categories: Array<{
      id: string;
      type: string;
      registeredCount: number;
      maxPlayers: number;
    }>;
  };
  pools: Array<{
    name: string;
    entries: Array<{
      name: string;
      wins: number;
      losses: number;
      pf: number;
      pa: number;
      diff: number;
    }>;
  }>;
  bracketRounds: Array<{
    name: string;
    matches: Array<{
      p1: string;
      p2: string;
      score: string | null;
      winner: number | null;
    }>;
  }>;
}) {
  const t = useTranslations();

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
              <Card key={cat.id}>
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
          <PoolsView pools={pools} />
        </TabsContent>

        <TabsContent value="bracket" className="mt-6">
          <BracketView rounds={bracketRounds} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PoolsView({
  pools,
}: {
  pools: Array<{
    name: string;
    entries: Array<{
      name: string;
      wins: number;
      losses: number;
      pf: number;
      pa: number;
      diff: number;
    }>;
  }>;
}) {
  const t = useTranslations();

  if (pools.length === 0) {
    return (
      <p className="text-center text-muted-foreground">
        {t("tournament.noTournaments")}
      </p>
    );
  }

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

function BracketView({
  rounds,
}: {
  rounds: Array<{
    name: string;
    matches: Array<{
      p1: string;
      p2: string;
      score: string | null;
      winner: number | null;
    }>;
  }>;
}) {
  const t = useTranslations();

  if (rounds.length === 0) {
    return (
      <p className="text-center text-muted-foreground">
        {t("tournament.noTournaments")}
      </p>
    );
  }

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
