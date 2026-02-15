import { createBslAuthClient } from "@bsl-plume/auth/client";

export const authClient = createBslAuthClient(
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
);
