import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

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

export default withNextIntl(nextConfig);
