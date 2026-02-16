"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useTournamentChannel } from "@bsl-plume/realtime/react";
import type { RealtimeEvent } from "@bsl-plume/realtime";
import { useRealtime } from "@/providers/realtime-provider";
import { StatusControls } from "./status-controls";
import { CategoryActions } from "./category-actions";
import { MatchScoreForm } from "./match-score-form";

type CategoryData = {
  id: string;
  type: string;
  maxPlayers: number;
  registeredCount: number;
  registrations: Array<{
    id: string;
    playerId: string;
    playerName: string;
    status: string;
    registeredAt: string;
  }>;
  hasPools: boolean;
  hasBracket: boolean;
};

type MatchData = {
  id: string;
  round: number;
  position: number;
  participant1: string;
  participant2: string;
  status: string;
  courtNumber: number | null;
  score: string | null;
  categoryType: string;
  source: "pool" | "bracket";
};

type CourtData = {
  id: string;
  number: number;
  name: string;
  status: string;
  currentMatchId: string | null;
};

export function AdminTournamentDetail({
  tournament,
  clubId,
  clubSlug,
  categories,
  matches,
  courts,
}: {
  tournament: {
    id: string;
    name: string;
    status: string;
    location: string;
    startDate: string;
    endDate: string;
    registrationStart: string;
    registrationEnd: string;
  };
  clubId: string;
  clubSlug: string;
  categories: CategoryData[];
  matches: MatchData[];
  courts: CourtData[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const provider = useRealtime();
  const [scoringMatchId, setScoringMatchId] = useState<string | null>(null);

  // Subscribe to tournament channel — refresh on events from other clients
  const onEvent = useCallback(() => {
    router.refresh();
  }, [router]);
  useTournamentChannel(provider, tournament.id, onEvent);

  // Publish realtime event to all connected clients
  const publishEvent = useCallback(
    async (event: RealtimeEvent) => {
      if (!provider) return;
      await provider.publish(`tournament:${tournament.id}`, event);
    },
    [provider, tournament.id],
  );

  const totalRegistrations = categories.reduce(
    (sum, c) => sum + c.registeredCount,
    0,
  );
  const availableCourts = courts.filter((c) => c.status === "available").length;
  const activeMatches = matches.filter((m) => m.status === "in_progress");
  const scheduledMatches = matches.filter((m) => m.status === "scheduled");

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{tournament.name}</h1>
          <p className="mt-1 text-muted-foreground">{tournament.location}</p>
          <p className="text-sm text-muted-foreground">
            {new Date(tournament.startDate).toLocaleDateString()} —{" "}
            {new Date(tournament.endDate).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="default">
            {t(`tournament.status.${tournament.status}`)}
          </Badge>
          <StatusControls
            tournamentId={tournament.id}
            currentStatus={tournament.status}
            clubId={clubId}
            clubSlug={clubSlug}
          />
        </div>
      </div>

      <Separator className="my-6" />

      {/* Stats cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("admin.tournamentDetail.totalRegistrations")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalRegistrations}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("admin.tournamentDetail.totalMatches")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{matches.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("admin.tournamentDetail.availableCourts")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {availableCourts} / {courts.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("tournament.fields.categories")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{categories.length}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">
            {t("admin.tournamentDetail.overview")}
          </TabsTrigger>
          <TabsTrigger value="registrations">
            {t("admin.tournamentDetail.registrations")}
          </TabsTrigger>
          <TabsTrigger value="matches">
            {t("admin.tournamentDetail.matches")}
          </TabsTrigger>
        </TabsList>

        {/* Overview tab: categories with pool/bracket generation actions */}
        <TabsContent value="overview" className="mt-6">
          <div className="space-y-4">
            {categories.map((cat) => (
              <Card key={cat.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{t(`category.${cat.type}`)}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {cat.registeredCount} / {cat.maxPlayers}
                      </Badge>
                      {cat.hasPools && (
                        <Badge variant="outline">
                          {t("admin.tournamentDetail.poolsGenerated")}
                        </Badge>
                      )}
                      {cat.hasBracket && (
                        <Badge variant="outline">
                          {t("admin.tournamentDetail.bracketGenerated")}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-3 h-2 rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{
                        width: `${Math.min(100, (cat.registeredCount / cat.maxPlayers) * 100)}%`,
                      }}
                    />
                  </div>
                  <CategoryActions
                    categoryId={cat.id}
                    registeredCount={cat.registeredCount}
                    hasPools={cat.hasPools}
                    hasBracket={cat.hasBracket}
                    clubId={clubId}
                    clubSlug={clubSlug}
                    onPublish={publishEvent}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Registrations tab */}
        <TabsContent value="registrations" className="mt-6">
          <div className="space-y-6">
            {categories.map((cat) => (
              <Card key={cat.id}>
                <CardHeader>
                  <CardTitle>
                    {t(`category.${cat.type}`)} ({cat.registeredCount})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {cat.registrations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t("admin.tournamentDetail.noRegistrations")}
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left">
                            <th className="pb-2 font-medium">
                              {t("admin.tournamentDetail.player")}
                            </th>
                            <th className="pb-2 font-medium">
                              {t("admin.tournamentDetail.status")}
                            </th>
                            <th className="pb-2 font-medium">
                              {t("admin.tournamentDetail.registeredAt")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {cat.registrations.map((reg) => (
                            <tr
                              key={reg.id}
                              className="border-b last:border-0"
                            >
                              <td className="py-2">{reg.playerName}</td>
                              <td className="py-2">
                                <Badge
                                  variant={
                                    reg.status === "confirmed"
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {t(`registration.status.${reg.status}`)}
                                </Badge>
                              </td>
                              <td className="py-2 text-muted-foreground">
                                {new Date(
                                  reg.registeredAt,
                                ).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Matches tab */}
        <TabsContent value="matches" className="mt-6">
          {matches.length === 0 ? (
            <p className="text-center text-muted-foreground">
              {t("admin.tournamentDetail.noMatches")}
            </p>
          ) : (
            <div className="space-y-6">
              {/* Active matches first */}
              {activeMatches.length > 0 && (
                <div>
                  <h3 className="mb-3 text-lg font-semibold">
                    {t("match.status.in_progress")} ({activeMatches.length})
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    {activeMatches.map((match) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        onScore={() => setScoringMatchId(match.id)}
                        tournamentId={tournament.id}
                        clubSlug={clubSlug}
                        onPublish={publishEvent}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Scheduled matches */}
              {scheduledMatches.length > 0 && (
                <div>
                  <h3 className="mb-3 text-lg font-semibold">
                    {t("match.status.scheduled")} ({scheduledMatches.length})
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    {scheduledMatches.map((match) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        onScore={() => setScoringMatchId(match.id)}
                        tournamentId={tournament.id}
                        clubSlug={clubSlug}
                        onPublish={publishEvent}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Completed matches */}
              {matches.filter((m) => m.status === "completed").length > 0 && (
                <div>
                  <h3 className="mb-3 text-lg font-semibold">
                    {t("match.status.completed")} (
                    {matches.filter((m) => m.status === "completed").length})
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    {matches
                      .filter((m) => m.status === "completed")
                      .map((match) => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          tournamentId={tournament.id}
                          clubSlug={clubSlug}
                        />
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Score entry modal */}
          {scoringMatchId && (
            <MatchScoreForm
              matchId={scoringMatchId}
              match={matches.find((m) => m.id === scoringMatchId)!}
              clubSlug={clubSlug}
              onClose={() => setScoringMatchId(null)}
              onPublish={publishEvent}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MatchCard({
  match,
  onScore,
  tournamentId,
  clubSlug,
  onPublish,
}: {
  match: MatchData;
  onScore?: () => void;
  tournamentId: string;
  clubSlug: string;
  onPublish?: (event: RealtimeEvent) => Promise<void>;
}) {
  const t = useTranslations();
  const [isAssigning, setIsAssigning] = useState(false);

  async function handleAssignCourt() {
    setIsAssigning(true);
    const { assignCourtAction } = await import("@/app/actions/scoring");
    const result = await assignCourtAction(match.id, tournamentId, clubSlug);
    if (result.success) {
      await onPublish?.({
        type: "match:started",
        matchId: match.id,
        courtNumber: result.data.courtNumber,
      });
    }
    setIsAssigning(false);
  }

  return (
    <Card
      className={
        match.status === "in_progress"
          ? "border-primary/40"
          : match.status === "completed"
            ? "border-primary/20"
            : ""
      }
    >
      <CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <Badge variant="outline" className="text-xs">
            {t(`category.${match.categoryType}`)} — {match.source === "pool" ? t("pool.title") : t("bracket.title")}
          </Badge>
          {match.courtNumber && (
            <Badge variant="secondary" className="text-xs">
              {t("match.court")} {match.courtNumber}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">{match.participant1}</p>
            <p className="text-xs text-muted-foreground">{t("match.vs")}</p>
            <p className="text-sm font-medium">{match.participant2}</p>
          </div>
          {match.score && (
            <Badge variant="secondary">{match.score}</Badge>
          )}
        </div>

        {match.status !== "completed" && (
          <div className="mt-3 flex gap-2">
            {match.status === "scheduled" && !match.courtNumber && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleAssignCourt}
                disabled={isAssigning}
              >
                {isAssigning
                  ? t("common.loading")
                  : t("admin.tournamentDetail.assignCourt")}
              </Button>
            )}
            {match.status === "in_progress" && onScore && (
              <Button size="sm" onClick={onScore}>
                {t("admin.tournamentDetail.enterScore")}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
