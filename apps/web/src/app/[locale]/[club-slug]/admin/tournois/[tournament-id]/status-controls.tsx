"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { updateTournamentStatusAction } from "@/app/actions/tournament";

const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ["registration_open", "cancelled"],
  registration_open: ["registration_closed", "cancelled"],
  registration_closed: ["in_progress", "registration_open", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

const STATUS_LABELS: Record<string, string> = {
  registration_open: "openRegistrations",
  registration_closed: "closeRegistrations",
  in_progress: "startTournament",
  completed: "completeTournament",
  cancelled: "cancelTournament",
};

export function StatusControls({
  tournamentId,
  currentStatus,
  clubId,
  clubSlug,
}: {
  tournamentId: string;
  currentStatus: string;
  clubId: string;
  clubSlug: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const transitions = STATUS_TRANSITIONS[currentStatus] ?? [];

  async function handleStatusChange(newStatus: string) {
    setIsLoading(true);
    const result = await updateTournamentStatusAction(
      tournamentId,
      newStatus,
      clubSlug,
      clubId,
    );

    if (result.success) {
      router.refresh();
    }
    setIsLoading(false);
  }

  if (transitions.length === 0) return null;

  return (
    <div className="flex gap-2">
      {transitions.map((status) => (
        <Button
          key={status}
          size="sm"
          variant={status === "cancelled" ? "destructive" : "outline"}
          onClick={() => handleStatusChange(status)}
          disabled={isLoading}
        >
          {isLoading
            ? t("common.loading")
            : t(
                `admin.tournamentDetail.${STATUS_LABELS[status] ?? "changeStatus"}`,
              )}
        </Button>
      ))}
    </div>
  );
}
