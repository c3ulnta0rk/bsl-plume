"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTournamentChannel } from "@bsl-plume/realtime/react";
import { useRealtime } from "@/providers/realtime-provider";

export function RealtimeRefresher({
  tournamentId,
}: {
  tournamentId: string;
}) {
  const provider = useRealtime();
  const router = useRouter();

  const onEvent = useCallback(() => {
    router.refresh();
  }, [router]);

  useTournamentChannel(provider, tournamentId, onEvent);

  return null;
}
