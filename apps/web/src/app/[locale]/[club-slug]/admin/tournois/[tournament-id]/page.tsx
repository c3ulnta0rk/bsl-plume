import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import {
  getTournamentById,
  getClubBySlug,
  listCategoriesByTournament,
  countRegistrationsByCategory,
  listRegistrationsByCategory,
  listPoolsByCategory,
  getBracketByCategory,
  listMatchesByBracket,
  listMatchesByPool,
  listCourtsByTournament,
  getPlayerById,
} from "@bsl-plume/db/queries";
import { AdminTournamentDetail } from "./admin-tournament-detail";

export default async function AdminTournamentDetailPage({
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

  const club = await getClubBySlug(db, clubSlug);
  if (!club) notFound();

  const tournament = await getTournamentById(db, tournamentId);
  if (!tournament || tournament.clubId !== club.id) notFound();

  const categories = await listCategoriesByTournament(db, tournament.id);
  const courts = await listCourtsByTournament(db, tournament.id);

  // Load categories with registration counts and player details
  const categoriesData = await Promise.all(
    categories.map(async (cat) => {
      const [countResult] = await countRegistrationsByCategory(db, cat.id);
      const registrations = await listRegistrationsByCategory(db, cat.id);

      const registrationsWithPlayers = await Promise.all(
        registrations.map(async (reg) => {
          const player = await getPlayerById(db, reg.playerId);
          return {
            id: reg.id,
            playerId: reg.playerId,
            playerName: player
              ? `${player.firstName} ${player.lastName}`
              : reg.playerId.slice(0, 8),
            status: reg.status,
            registeredAt: reg.registeredAt.toISOString(),
          };
        }),
      );

      const pools = await listPoolsByCategory(db, cat.id);
      const bracket = await getBracketByCategory(db, cat.id);

      return {
        id: cat.id,
        type: cat.type,
        maxPlayers: cat.maxPlayers,
        registeredCount: countResult?.count ?? 0,
        registrations: registrationsWithPlayers,
        hasPools: pools.length > 0,
        hasBracket: bracket !== undefined,
      };
    }),
  );

  // Load all matches across pools and brackets
  const allMatches: Array<{
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
  }> = [];

  for (const cat of categories) {
    const pools = await listPoolsByCategory(db, cat.id);
    for (const pool of pools) {
      const poolMatches = await listMatchesByPool(db, pool.id);
      for (const m of poolMatches) {
        const p1 = m.participant1Id
          ? await getPlayerById(db, m.participant1Id)
          : null;
        const p2 = m.participant2Id
          ? await getPlayerById(db, m.participant2Id)
          : null;
        allMatches.push({
          id: m.id,
          round: m.round,
          position: m.position,
          participant1: p1
            ? `${p1.lastName}, ${p1.firstName.charAt(0)}.`
            : "TBD",
          participant2: p2
            ? `${p2.lastName}, ${p2.firstName.charAt(0)}.`
            : "TBD",
          status: m.status,
          courtNumber: m.courtNumber,
          score: formatScore(m),
          categoryType: cat.type,
          source: "pool",
        });
      }
    }

    const bracket = await getBracketByCategory(db, cat.id);
    if (bracket) {
      const bracketMatches = await listMatchesByBracket(db, bracket.id);
      for (const m of bracketMatches) {
        const p1 = m.participant1Id
          ? await getPlayerById(db, m.participant1Id)
          : null;
        const p2 = m.participant2Id
          ? await getPlayerById(db, m.participant2Id)
          : null;
        allMatches.push({
          id: m.id,
          round: m.round,
          position: m.position,
          participant1: p1
            ? `${p1.lastName}, ${p1.firstName.charAt(0)}.`
            : "TBD",
          participant2: p2
            ? `${p2.lastName}, ${p2.firstName.charAt(0)}.`
            : "TBD",
          status: m.status,
          courtNumber: m.courtNumber,
          score: formatScore(m),
          categoryType: cat.type,
          source: "bracket",
        });
      }
    }
  }

  return (
    <AdminTournamentDetail
      tournament={{
        id: tournament.id,
        name: tournament.name,
        status: tournament.status,
        location: tournament.location ?? "",
        startDate: tournament.startDate.toISOString(),
        endDate: tournament.endDate.toISOString(),
        registrationStart: tournament.registrationStart.toISOString(),
        registrationEnd: tournament.registrationEnd.toISOString(),
      }}
      clubId={club.id}
      clubSlug={clubSlug}
      categories={categoriesData}
      matches={allMatches}
      courts={courts.map((c) => ({
        id: c.id,
        number: c.number,
        name: c.name,
        status: c.status,
        currentMatchId: c.currentMatchId,
      }))}
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
  status: string;
}): string | null {
  if (m.status !== "completed" || m.scoreSet1P1 === null) return null;
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
