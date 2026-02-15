import { createAuthClient } from "better-auth/react";

export function createBslAuthClient(baseURL: string) {
  return createAuthClient({
    baseURL,
  });
}

export type AuthClient = ReturnType<typeof createBslAuthClient>;
