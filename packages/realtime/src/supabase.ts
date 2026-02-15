import type { SupabaseClient } from "@supabase/supabase-js";
import type { RealtimeEvent, RealtimeProvider } from "./types";

export function createSupabaseRealtime(
  client: SupabaseClient,
): RealtimeProvider {
  return {
    subscribe(
      channel: string,
      callback: (event: RealtimeEvent) => void,
    ): () => void {
      const subscription = client
        .channel(channel)
        .on("broadcast", { event: "tournament" }, (payload) => {
          const event = payload.payload as RealtimeEvent;
          callback(event);
        })
        .subscribe();

      return () => {
        client.removeChannel(subscription);
      };
    },

    async publish(channel: string, event: RealtimeEvent): Promise<void> {
      await client.channel(channel).send({
        type: "broadcast",
        event: "tournament",
        payload: event,
      });
    },
  };
}
