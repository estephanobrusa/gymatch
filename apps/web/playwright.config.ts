import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // sequential — dev server is single instance
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // Mobile viewport — Gymatch is a PWA
    viewport: { width: 390, height: 844 }, // iPhone 14 size, Chromium
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
  },

  // Start the dev server automatically before running tests
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      // Point to .env.local automatically
      NODE_ENV: "test",
    },
  },

  projects: [
    // Setup project — creates auth state file
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    // Tests that require auth — depend on setup
    {
      name: "authenticated",
      testMatch: /.*\.auth\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        storageState: "e2e/.auth/user.json",
      },
    },
    // Tests that don't require auth
    {
      name: "public",
      testMatch: /.*\.public\.spec\.ts/,
    },
  ],
});
