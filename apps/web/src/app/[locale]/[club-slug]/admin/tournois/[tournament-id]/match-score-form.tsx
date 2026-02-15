"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { submitScoreAction } from "@/app/actions/scoring";

export function MatchScoreForm({
  matchId,
  match,
  clubSlug,
  onClose,
}: {
  matchId: string;
  match: {
    participant1: string;
    participant2: string;
  };
  clubSlug: string;
  onClose: () => void;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sets, setSets] = useState([
    { score1: 0, score2: 0 },
    { score1: 0, score2: 0 },
    { score1: 0, score2: 0 },
  ]);

  function updateSet(
    setIndex: number,
    player: "score1" | "score2",
    value: number,
  ) {
    setSets((prev) =>
      prev.map((s, i) => (i === setIndex ? { ...s, [player]: value } : s)),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Only send sets that have been played (at least one score > 0)
    const playedSets = sets.filter((s) => s.score1 > 0 || s.score2 > 0);

    if (playedSets.length < 2) {
      setError("At least 2 sets required");
      setIsSubmitting(false);
      return;
    }

    const result = await submitScoreAction(matchId, playedSets, clubSlug);

    if (!result.success) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("admin.tournamentDetail.enterScore")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {match.participant1} {t("match.vs")} {match.participant2}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center text-sm font-medium">
                <div>{match.participant1}</div>
                <div />
                <div>{match.participant2}</div>
              </div>

              {[0, 1, 2].map((setIndex) => (
                <div key={setIndex} className="grid grid-cols-3 items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    value={sets[setIndex]!.score1}
                    onChange={(e) =>
                      updateSet(setIndex, "score1", Number(e.target.value))
                    }
                    className="text-center"
                  />
                  <Label className="text-center text-xs text-muted-foreground">
                    {t(`admin.tournamentDetail.set${setIndex + 1}` as
                      "admin.tournamentDetail.set1" | "admin.tournamentDetail.set2" | "admin.tournamentDetail.set3"
                    )}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    value={sets[setIndex]!.score2}
                    onChange={(e) =>
                      updateSet(setIndex, "score2", Number(e.target.value))
                    }
                    className="text-center"
                  />
                </div>
              ))}
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? t("common.loading")
                  : t("admin.tournamentDetail.submitScore")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                {t("common.cancel")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
