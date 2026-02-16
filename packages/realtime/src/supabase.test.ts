import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseRealtime } from "./supabase";
import type { RealtimeEvent } from "./types";

function createMockClient() {
  const mockSubscription = { id: "sub-1" };
  const handlers: Array<(payload: { payload: RealtimeEvent }) => void> = [];

  const channelInstance = {
    on: vi.fn((_type: string, _filter: unknown, handler: (payload: { payload: RealtimeEvent }) => void) => {
      handlers.push(handler);
      return channelInstance;
    }),
    subscribe: vi.fn(() => mockSubscription),
    send: vi.fn().mockResolvedValue(undefined),
  };

  const client = {
    channel: vi.fn(() => channelInstance),
    removeChannel: vi.fn(),
  } as unknown as SupabaseClient;

  return { client, channelInstance, mockSubscription, handlers };
}

describe("createSupabaseRealtime", () => {
  let mock: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    mock = createMockClient();
  });

  it("subscribe calls client.channel and returns unsubscribe function", () => {
    const provider = createSupabaseRealtime(mock.client);
    const callback = vi.fn();

    const unsubscribe = provider.subscribe("tournament:t1", callback);

    expect(mock.client.channel).toHaveBeenCalledWith("tournament:t1");
    expect(mock.channelInstance.on).toHaveBeenCalledWith(
      "broadcast",
      { event: "tournament" },
      expect.any(Function),
    );
    expect(mock.channelInstance.subscribe).toHaveBeenCalled();
    expect(typeof unsubscribe).toBe("function");
  });

  it("unsubscribe calls client.removeChannel", () => {
    const provider = createSupabaseRealtime(mock.client);
    const unsubscribe = provider.subscribe("tournament:t1", vi.fn());

    unsubscribe();

    expect(mock.client.removeChannel).toHaveBeenCalledWith(
      mock.mockSubscription,
    );
  });

  it("publish calls channel.send with broadcast type", async () => {
    const provider = createSupabaseRealtime(mock.client);
    const event: RealtimeEvent = {
      type: "match:started",
      matchId: "m1",
      courtNumber: 3,
    };

    await provider.publish("tournament:t1", event);

    expect(mock.client.channel).toHaveBeenCalledWith("tournament:t1");
    expect(mock.channelInstance.send).toHaveBeenCalledWith({
      type: "broadcast",
      event: "tournament",
      payload: event,
    });
  });

  it("event callback receives parsed payload", () => {
    const provider = createSupabaseRealtime(mock.client);
    const callback = vi.fn();
    provider.subscribe("tournament:t1", callback);

    const event: RealtimeEvent = {
      type: "match:ended",
      matchId: "m1",
      winnerId: "p1",
      score: { sets: [{ score1: 21, score2: 15 }, { score1: 21, score2: 18 }] },
    };

    // Simulate broadcast event
    mock.handlers[0]!({ payload: event });

    expect(callback).toHaveBeenCalledWith(event);
  });
});
