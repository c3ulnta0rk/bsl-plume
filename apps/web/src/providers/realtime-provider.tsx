"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { RealtimeProvider } from "@bsl-plume/realtime";
import { createSupabaseRealtime } from "@bsl-plume/realtime";
import { createBrowserSupabaseClient } from "@/lib/supabase";

const RealtimeContext = createContext<RealtimeProvider | null>(null);

export function RealtimeProviderWrapper({
  children,
}: {
  children: ReactNode;
}) {
  const provider = useMemo(
    () => createSupabaseRealtime(createBrowserSupabaseClient()),
    [],
  );

  return (
    <RealtimeContext.Provider value={provider}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime(): RealtimeProvider | null {
  return useContext(RealtimeContext);
}
