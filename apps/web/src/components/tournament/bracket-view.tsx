"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

export interface BracketMatchData {
  id: string;
  round: number;
  position: number;
  p1: string;
  p2: string;
  sets: Array<{ p1: number; p2: number }>;
  winner: 1 | 2 | null;
  status: string;
  courtNumber: number | null;
}

export interface CategoryBracket {
  categoryType: string;
  roundCount: number;
  matches: BracketMatchData[];
}

interface BracketViewProps {
  categories: CategoryBracket[];
}

export function BracketView({ categories }: BracketViewProps) {
  const t = useTranslations();

  const withBrackets = categories.filter((c) => c.matches.length > 0);

  if (withBrackets.length === 0) {
    return (
      <p className="text-center text-muted-foreground">
        {t("tournament.noTournaments")}
      </p>
    );
  }

  return <CategoryBracketTabs categories={withBrackets} />;
}

function CategoryBracketTabs({
  categories,
}: {
  categories: CategoryBracket[];
}) {
  const t = useTranslations();
  const [active, setActive] = useState(
    categories[0]?.categoryType ?? "",
  );

  const activeCat = categories.find((c) => c.categoryType === active);

  return (
    <div>
      {/* Category selector */}
      <div className="mb-4 flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat.categoryType}
            onClick={() => setActive(cat.categoryType)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active === cat.categoryType
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {t(`category.${cat.categoryType}`)}
          </button>
        ))}
      </div>

      {/* Bracket tree for active category */}
      {activeCat && (
        <BracketTree
          roundCount={activeCat.roundCount}
          matches={activeCat.matches}
        />
      )}
    </div>
  );
}

function BracketTree({
  roundCount,
  matches,
}: {
  roundCount: number;
  matches: BracketMatchData[];
}) {
  function getRoundName(round: number): string {
    const matchesInRound = Math.pow(2, roundCount - round);
    if (matchesInRound === 1) return "Finale";
    if (matchesInRound === 2) return "Demi-finales";
    if (matchesInRound === 4) return "Quarts de finale";
    if (matchesInRound === 8) return "8e de finale";
    return `Tour ${round}`;
  }

  const rounds = Array.from({ length: roundCount }, (_, i) => i + 1);

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex items-stretch gap-0">
        {rounds.map((round) => {
          const roundMatches = matches
            .filter((m) => m.round === round)
            .sort((a, b) => a.position - b.position);
          const isLastRound = round === roundCount;

          return (
            <div key={round} className="flex shrink-0 items-stretch">
              {/* Match column */}
              <div className="flex w-[200px] shrink-0 flex-col">
                {/* Header */}
                <div className="mb-2 text-center text-xs font-semibold text-muted-foreground">
                  {getRoundName(round)}
                </div>
                {/* Matches with spacing */}
                <div className="flex flex-1 flex-col justify-around">
                  {roundMatches.map((match) => (
                    <div key={match.id} className="px-1 py-1">
                      <MatchCard match={match} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Connector column between rounds */}
              {!isLastRound && (
                <div className="flex w-6 shrink-0 flex-col">
                  {/* Spacer for header */}
                  <div className="mb-2 h-[16px]" />
                  {/* Connectors: one per pair of matches in this round */}
                  <div className="flex flex-1 flex-col justify-around">
                    {Array.from(
                      { length: roundMatches.length / 2 },
                      (_, i) => (
                        <ConnectorPair key={`conn-${round}-${i}`} />
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MatchCard({ match }: { match: BracketMatchData }) {
  const isCompleted = match.status === "completed";
  const isInProgress = match.status === "in_progress";

  return (
    <div
      className={`rounded border text-xs ${
        isCompleted
          ? "border-border bg-card"
          : isInProgress
            ? "border-primary/40 bg-primary/5"
            : "border-border/50 bg-muted/30"
      }`}
    >
      {/* Player 1 */}
      <div
        className={`flex items-center justify-between border-b border-border/30 px-2 py-1.5 ${
          match.winner === 1 ? "bg-primary/5 font-semibold" : ""
        }`}
      >
        <span className="max-w-[120px] truncate">{match.p1}</span>
        {isCompleted && match.sets.length > 0 && (
          <span className="ml-1 shrink-0 font-mono text-muted-foreground">
            {match.sets.map((s) => s.p1).join(" ")}
          </span>
        )}
      </div>
      {/* Player 2 */}
      <div
        className={`flex items-center justify-between px-2 py-1.5 ${
          match.winner === 2 ? "bg-primary/5 font-semibold" : ""
        }`}
      >
        <span className="max-w-[120px] truncate">{match.p2}</span>
        {isCompleted && match.sets.length > 0 && (
          <span className="ml-1 shrink-0 font-mono text-muted-foreground">
            {match.sets.map((s) => s.p2).join(" ")}
          </span>
        )}
      </div>
      {/* Court badge for in-progress */}
      {isInProgress && match.courtNumber !== null && (
        <div className="border-t border-border/30 px-2 py-0.5 text-center">
          <Badge variant="outline" className="h-4 text-[10px]">
            T{match.courtNumber}
          </Badge>
        </div>
      )}
    </div>
  );
}

/**
 * Connector lines between a pair of matches feeding into the next round.
 *
 *   ─┐
 *    ├─
 *   ─┘
 */
function ConnectorPair() {
  return (
    <div className="flex h-full flex-col">
      {/* Top half: horizontal line then vertical down */}
      <div className="flex flex-1 flex-col">
        <div className="flex-1" />
        <div className="border-t border-border" />
        <div className="flex-1 border-r border-border" />
      </div>
      {/* Middle: horizontal line out to next match */}
      <div className="border-t border-border" />
      {/* Bottom half: vertical up then horizontal line */}
      <div className="flex flex-1 flex-col">
        <div className="flex-1 border-r border-border" />
        <div className="border-t border-border" />
        <div className="flex-1" />
      </div>
    </div>
  );
}
