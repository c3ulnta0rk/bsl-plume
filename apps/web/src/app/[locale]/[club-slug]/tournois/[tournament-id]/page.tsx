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
  getPlayerById,
  getPlayerByUserId,
  getRegistration,
} from "@bsl-plume/db/queries";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { RegisterButton } from "./register-button";
import { RealtimeRefresher } from "@/components/realtime-refresher";
import { PoolsView, type CategoryPools } from "@/components/tournament/pools-view";
import {
  BracketView,
  type BracketMatchData,
  type CategoryBracket,
} from "@/components/tournament/bracket-view";

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{
    locale: string;
    "club-slug": string;
    "tournament-id": string;
  }>;
}) {
  const {
    locale,
    "club-slug": clubSlug,
    "tournament-id": tournamentId,
  } = await params;
  setRequestLocale(locale);

  const tournament = await getTournamentById(db, tournamentId);
  if (!tournament) {
    notFound();
  }

  const categories = await listCategoriesByTournament(db, tournament.id);

  const user = await getSession();
  const player = user ? await getPlayerByUserId(db, user.id) : null;
  const isRegistrationOpen = tournament.status === "registration_open";

  const categoriesWithCount = await Promise.all(
    categories.map(async (cat) => {
      const [countResult] = await countRegistrationsByCategory(db, cat.id);
      const registeredCount = countResult?.count ?? 0;

      let registrationId: string | null = null;
      if (player) {
        const reg = await getRegistration(db, player.id, cat.id);
        if (reg) registrationId = reg.id;
      }

      return {
        id: cat.id,
        type: cat.type,
        maxPlayers: cat.maxPlayers,
        registeredCount,
        isRegistered: registrationId !== null,
        registrationId,
        isFull: registeredCount >= cat.maxPlayers,
      };
    }),
  );

  // Helper to resolve player name
  async function resolvePlayerName(playerId: string | null): Promise<string> {
    if (!playerId) return "TBD";
    const p = await getPlayerById(db, playerId);
    return p ? `${p.lastName}, ${p.firstName.charAt(0)}.` : "TBD";
  }

  // Load pools grouped by category
  const categoryPoolsData: CategoryPools[] = await Promise.all(
    categories.map(async (cat) => {
      const pools = await listPoolsByCategory(db, cat.id);
      const poolsWithEntries = await Promise.all(
        pools.map(async (pool) => {
          const entries = await listPoolEntries(db, pool.id);
          const entriesWithNames = await Promise.all(
            entries.map(async (entry) => {
              const name = await resolvePlayerName(entry.playerId);
              return {
                name,
                wins: entry.wins,
                losses: entry.losses,
                pf: entry.pointsFor,
                pa: entry.pointsAgainst,
                diff: entry.pointsFor - entry.pointsAgainst,
              };
            }),
          );
          entriesWithNames.sort(
            (a, b) => b.wins - a.wins || (b.pf - b.pa) - (a.pf - a.pa),
          );
          return { name: pool.name, entries: entriesWithNames };
        }),
      );
      return { categoryType: cat.type, pools: poolsWithEntries };
    }),
  );

  // Load brackets grouped by category
  const categoryBracketsData: CategoryBracket[] = await Promise.all(
    categories.map(async (cat) => {
      const bracket = await getBracketByCategory(db, cat.id);
      if (!bracket) {
        return { categoryType: cat.type, roundCount: 0, matches: [] };
      }
      const matchList = await listMatchesByBracket(db, bracket.id);

      const matches: BracketMatchData[] = await Promise.all(
        matchList.map(async (m) => {
          const p1Name = await resolvePlayerName(m.participant1Id);
          const p2Name = await resolvePlayerName(m.participant2Id);

          const sets: Array<{ p1: number; p2: number }> = [];
          if (m.scoreSet1P1 !== null && m.scoreSet1P2 !== null) {
            sets.push({ p1: m.scoreSet1P1, p2: m.scoreSet1P2 });
          }
          if (m.scoreSet2P1 !== null && m.scoreSet2P2 !== null) {
            sets.push({ p1: m.scoreSet2P1, p2: m.scoreSet2P2 });
          }
          if (m.scoreSet3P1 !== null && m.scoreSet3P2 !== null) {
            sets.push({ p1: m.scoreSet3P1, p2: m.scoreSet3P2 });
          }

          return {
            id: m.id,
            round: m.round,
            position: m.position,
            p1: p1Name,
            p2: p2Name,
            sets,
            winner:
              m.winnerId === m.participant1Id
                ? (1 as const)
                : m.winnerId === m.participant2Id
                  ? (2 as const)
                  : null,
            status: m.status,
            courtNumber: m.courtNumber,
          };
        }),
      );

      return {
        categoryType: cat.type,
        roundCount: bracket.roundCount,
        matches,
      };
    }),
  );

  return (
    <>
      <RealtimeRefresher tournamentId={tournament.id} />
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
        categoryPools={categoryPoolsData}
        categoryBrackets={categoryBracketsData}
        clubSlug={clubSlug}
        isLoggedIn={user !== null}
        hasPlayerProfile={player !== null}
        isRegistrationOpen={isRegistrationOpen}
      />
    </>
  );
}

function TournamentDetail({
  tournament,
  categoryPools,
  categoryBrackets,
  clubSlug,
  isLoggedIn,
  hasPlayerProfile,
  isRegistrationOpen,
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
      isRegistered: boolean;
      registrationId: string | null;
      isFull: boolean;
    }>;
  };
  categoryPools: CategoryPools[];
  categoryBrackets: CategoryBracket[];
  clubSlug: string;
  isLoggedIn: boolean;
  hasPlayerProfile: boolean;
  isRegistrationOpen: boolean;
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
                  {isLoggedIn && hasPlayerProfile && isRegistrationOpen && (
                    <RegisterButton
                      categoryId={cat.id}
                      clubSlug={clubSlug}
                      isRegistered={cat.isRegistered}
                      registrationId={cat.registrationId}
                      isOpen={isRegistrationOpen}
                      isFull={cat.isFull}
                    />
                  )}
                  {isLoggedIn && hasPlayerProfile && cat.isRegistered && (
                    <p className="mt-2 text-xs text-green-600 dark:text-green-400">
                      {t("registration.alreadyRegistered")}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pools" className="mt-6">
          <PoolsView categories={categoryPools} />
        </TabsContent>

        <TabsContent value="bracket" className="mt-6">
          <BracketView categories={categoryBrackets} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
