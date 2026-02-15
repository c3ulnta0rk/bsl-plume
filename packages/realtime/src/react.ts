import { useEffect, useRef, useCallback, useState } from "react";
import type { RealtimeEvent, RealtimeProvider } from "./types";

export function useRealtimeSubscription(
  provider: RealtimeProvider | null,
  channel: string,
  onEvent: (event: RealtimeEvent) => void,
) {
  const callbackRef = useRef(onEvent);
  callbackRef.current = onEvent;

  useEffect(() => {
    if (!provider) return;

    const unsubscribe = provider.subscribe(channel, (event) => {
      callbackRef.current(event);
    });

    return unsubscribe;
  }, [provider, channel]);
}

export function useMatchUpdates(
  provider: RealtimeProvider | null,
  tournamentId: string,
) {
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);

  useRealtimeSubscription(
    provider,
    `tournament:${tournamentId}`,
    useCallback((event: RealtimeEvent) => {
      setLastEvent(event);
    }, []),
  );

  return lastEvent;
}

export function useTournamentChannel(
  provider: RealtimeProvider | null,
  tournamentId: string,
  onEvent: (event: RealtimeEvent) => void,
) {
  useRealtimeSubscription(
    provider,
    `tournament:${tournamentId}`,
    onEvent,
  );
}
