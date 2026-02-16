import { resolve } from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import withSerwistInit from "@serwist/next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: [
    "@bsl-plume/ui",
    "@bsl-plume/validators",
    "@bsl-plume/tournament-engine",
    "@bsl-plume/db",
    "@bsl-plume/realtime",
  ],
  turbopack: {
    root: resolve(process.cwd(), "../.."),
  },
};

export default withSerwist(withNextIntl(nextConfig));
