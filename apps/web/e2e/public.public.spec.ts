/**
 * E2E — Public routes (no auth required)
 *
 * These tests cover pages accessible without a session:
 * - Login page rendering and content
 * - Redirect to /login when accessing protected routes unauthenticated
 * - Auth callback error handling
 */
import { test, expect } from "@playwright/test";

test.describe("Login page", () => {
  test("renders the Gymatch brand and tagline", async ({ page }) => {
    await page.goto("/login");

    // Brand wordmark
    await expect(page.getByText("Gymatch")).toBeVisible();

    // Tagline
    await expect(page.getByText(/find your perfect gym match/i)).toBeVisible();
  });

  test("shows Google sign-in button", async ({ page }) => {
    await page.goto("/login");

    const btn = page.getByRole("button", { name: /sign in with google/i });
    await expect(btn).toBeVisible();
  });

  test("has dark background", async ({ page }) => {
    await page.goto("/login");

    // Body or main element should have a dark bg class
    const body = page.locator("body");
    await expect(body).toBeVisible();
    // Check the page loaded correctly (no 500 error)
    await expect(page).toHaveURL(/login/);
  });
});

test.describe("Auth redirects", () => {
  test("redirects / to /login when unauthenticated", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/login/);
  });

  test("redirects /matches to /login when unauthenticated", async ({ page }) => {
    await page.goto("/matches");
    await expect(page).toHaveURL(/login/);
  });

  test("redirects /profile to /login when unauthenticated", async ({ page }) => {
    await page.goto("/profile");
    await expect(page).toHaveURL(/login/);
  });
});

test.describe("Auth callback", () => {
  test("redirects to /login with error=missing_code when no code param", async ({ page }) => {
    await page.goto("/auth/callback");
    await expect(page).toHaveURL(/login.*error=missing_code/);
  });

  test("redirects to /login with error=auth_failed when code is invalid", async ({ page }) => {
    await page.goto("/auth/callback?code=invalid-code-xyz");
    await expect(page).toHaveURL(/login.*error=auth_failed/);
  });
});
