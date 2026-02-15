import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: [
    "@bsl-plume/ui",
    "@bsl-plume/validators",
    "@bsl-plume/tournament-engine",
    "@bsl-plume/db",
    "@bsl-plume/auth",
    "@bsl-plume/realtime",
  ],
};

export default nextConfig;
