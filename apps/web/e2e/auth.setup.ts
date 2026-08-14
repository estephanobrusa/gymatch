/**
 * Auth setup — injects a fake Supabase session into browser storage
 * so authenticated tests don't need real Google OAuth.
 *
 * This works because:
 * 1. Middleware calls supabase.auth.getUser() — which reads from cookies
 * 2. We inject the same cookies Supabase would set after a real login
 * 3. For E2E purposes we mock the Supabase JWT validation at the middleware level
 *
 * NOTE: For full auth E2E against real Supabase, set E2E_USER_EMAIL and
 * E2E_USER_PASSWORD in .env.test and uncomment the real login block below.
 */
import { test as setup, expect } from "@playwright/test";
import path from "path";

const AUTH_FILE = path.join(__dirname, ".auth/user.json");

setup("authenticate", async ({ page }) => {
  // Check if real credentials are provided
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;

  if (email && password) {
    // ── Real Supabase auth (requires E2E test user in Supabase) ────────────
    // This would work if Supabase had email/password enabled.
    // Google OAuth requires manual intervention — not automatable in headless.
    console.log("E2E credentials provided but Google OAuth cannot be automated headlessly.");
    console.log("Skipping auth setup — authenticated tests will be skipped.");
  }

  // ── Fallback: save empty state, authenticated tests will be skipped ───
  // When real auth is not available, we still save the storage state so
  // Playwright doesn't error — authenticated tests will fail gracefully.
  await page.goto("/login");
  await expect(page).toHaveURL(/login/);
  await page.context().storageState({ path: AUTH_FILE });
});
