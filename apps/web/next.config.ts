import path from "node:path";
import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  // Disable in dev by default to avoid cache interference, but allow opt-in
  // (DISABLE_SW_IN_DEV=true) so push notifications can be tested locally.
  disable:
    process.env.NODE_ENV === "development" &&
    process.env.DISABLE_SW_IN_DEV === "true",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Standalone output for the production Docker image (apps/web/server.js).
  output: "standalone",
  // Trace files from the monorepo root so workspace packages are bundled.
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: ["@gymatch/config", "@gymatch/db"],
};

export default withSerwist(nextConfig);
