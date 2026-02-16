"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RealtimeEvent } from "@bsl-plume/realtime";
import {
  generatePoolsAction,
  generateBracketAction,
} from "@/app/actions/pool-bracket";

export function CategoryActions({
  categoryId,
  registeredCount,
  hasPools,
  hasBracket,
  clubId,
  clubSlug,
  onPublish,
}: {
  categoryId: string;
  registeredCount: number;
  hasPools: boolean;
  hasBracket: boolean;
  clubId: string;
  clubSlug: string;
  onPublish?: (event: RealtimeEvent) => Promise<void>;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [isGeneratingPools, setIsGeneratingPools] = useState(false);
  const [isGeneratingBracket, setIsGeneratingBracket] = useState(false);
  const [poolCount, setPoolCount] = useState(2);
  const [error, setError] = useState<string | null>(null);

  async function handleGeneratePools() {
    setIsGeneratingPools(true);
    setError(null);

    const result = await generatePoolsAction(
      categoryId,
      poolCount,
      clubSlug,
      clubId,
    );

    if (!result.success) {
      setError(result.error);
    } else {
      await onPublish?.({
        type: "pool:updated",
        poolId: "",
        categoryId,
      });
      router.refresh();
    }
    setIsGeneratingPools(false);
  }

  async function handleGenerateBracket() {
    setIsGeneratingBracket(true);
    setError(null);

    const result = await generateBracketAction(categoryId, clubSlug, clubId);

    if (!result.success) {
      setError(result.error);
    } else {
      await onPublish?.({
        type: "bracket:updated",
        bracketId: "",
        categoryId,
      });
      router.refresh();
    }
    setIsGeneratingBracket(false);
  }

  return (
    <div className="space-y-3">
      {!hasPools && registeredCount >= 3 && (
        <div className="flex items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor={`poolCount-${categoryId}`} className="text-xs">
              {t("admin.tournamentDetail.poolCount")}
            </Label>
            <Input
              id={`poolCount-${categoryId}`}
              type="number"
              min={2}
              max={8}
              value={poolCount}
              onChange={(e) => setPoolCount(Number(e.target.value))}
              className="w-20"
            />
          </div>
          <Button
            size="sm"
            onClick={handleGeneratePools}
            disabled={isGeneratingPools}
          >
            {isGeneratingPools
              ? t("common.loading")
              : t("admin.generatePools")}
          </Button>
        </div>
      )}

      {hasPools && !hasBracket && (
        <Button
          size="sm"
          onClick={handleGenerateBracket}
          disabled={isGeneratingBracket}
        >
          {isGeneratingBracket
            ? t("common.loading")
            : t("admin.generateBracket")}
        </Button>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
