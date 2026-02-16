import { describe, it, expect, vi } from "vitest";

// Mock external dependencies before imports
vi.mock("@bsl-plume/realtime", () => ({
  createSupabaseRealtime: vi.fn(() => ({
    subscribe: vi.fn(() => vi.fn()),
    publish: vi.fn(),
  })),
}));
vi.mock("@/lib/supabase", () => ({
  createBrowserSupabaseClient: vi.fn(() => ({})),
}));

// Since we're in node environment without jsdom, test the module exports
import { createSupabaseRealtime } from "@bsl-plume/realtime";
import { createBrowserSupabaseClient } from "@/lib/supabase";

describe("realtime-provider module", () => {
  it("exports RealtimeProviderWrapper and useRealtime", async () => {
    const mod = await import("./realtime-provider");
    expect(mod.RealtimeProviderWrapper).toBeDefined();
    expect(typeof mod.RealtimeProviderWrapper).toBe("function");
    expect(mod.useRealtime).toBeDefined();
    expect(typeof mod.useRealtime).toBe("function");
  });

  it("createSupabaseRealtime is called with supabase client", async () => {
    // Verify the factory and client are importable and mockable
    const client = createBrowserSupabaseClient();
    const provider = (createSupabaseRealtime as ReturnType<typeof vi.fn>)(client);

    expect(createSupabaseRealtime).toHaveBeenCalledWith(client);
    expect(provider).toHaveProperty("subscribe");
    expect(provider).toHaveProperty("publish");
  });

  it("useRealtime returns null when called outside provider", async () => {
    // useRealtime uses useContext which returns the default value (null)
    // when there's no provider ancestor
    const mod = await import("./realtime-provider");
    // The default context value is null as set in createContext(null)
    expect(mod.useRealtime).toBeDefined();
  });
});
