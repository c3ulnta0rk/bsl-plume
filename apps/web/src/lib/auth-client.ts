import { createBslAuthClient, type AuthClient } from "@bsl-plume/auth/client";

export const authClient: AuthClient = createBslAuthClient(
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
);
