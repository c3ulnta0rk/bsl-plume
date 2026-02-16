import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RealtimeProvider } from "@bsl-plume/realtime";

const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ refresh: mockRefresh })),
}));

let capturedOnEvent: ((event: unknown) => void) | null = null;
vi.mock("@bsl-plume/realtime/react", () => ({
  useTournamentChannel: vi.fn(
    (_provider: unknown, _id: string, onEvent: (event: unknown) => void) => {
      capturedOnEvent = onEvent;
    },
  ),
}));

let mockProvider: RealtimeProvider | null = null;
vi.mock("@/providers/realtime-provider", () => ({
  useRealtime: () => mockProvider,
}));

// Mock React hooks so component can be called as a plain function in node env
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useCallback: (fn: unknown) => fn,
  };
});

import { useTournamentChannel } from "@bsl-plume/realtime/react";

describe("RealtimeRefresher", () => {
  beforeEach(() => {
    mockProvider = null;
    capturedOnEvent = null;
    mockRefresh.mockClear();
    vi.mocked(useTournamentChannel).mockClear();
  });

  it("exports a function component", async () => {
    const mod = await import("./realtime-refresher");
    expect(mod.RealtimeRefresher).toBeDefined();
    expect(typeof mod.RealtimeRefresher).toBe("function");
  });

  it("passes provider and tournamentId to useTournamentChannel", async () => {
    mockProvider = {
      subscribe: vi.fn(() => vi.fn()),
      publish: vi.fn(),
    };

    const { RealtimeRefresher } = await import("./realtime-refresher");
    RealtimeRefresher({ tournamentId: "t-123" });

    expect(useTournamentChannel).toHaveBeenCalledWith(
      mockProvider,
      "t-123",
      expect.any(Function),
    );
  });

  it("calls router.refresh when event callback is invoked", async () => {
    mockProvider = {
      subscribe: vi.fn(() => vi.fn()),
      publish: vi.fn(),
    };

    const { RealtimeRefresher } = await import("./realtime-refresher");
    RealtimeRefresher({ tournamentId: "t-456" });

    expect(capturedOnEvent).toBeDefined();
    capturedOnEvent!({ type: "match:started", matchId: "m1", courtNumber: 1 });

    expect(mockRefresh).toHaveBeenCalled();
  });
});
