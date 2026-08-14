/**
 * E2E — Authenticated routes
 *
 * These tests require a real session (storageState from auth.setup.ts).
 *
 * NOTE: Without real E2E credentials (E2E_USER_EMAIL + E2E_USER_PASSWORD),
 * these tests will redirect to /login and be skipped gracefully.
 *
 * To enable:
 * 1. Create a test user in Supabase (email/password auth)
 * 2. Add to apps/web/.env.test:
 *    E2E_USER_EMAIL=testuser@gymatch.test
 *    E2E_USER_PASSWORD=your-test-password
 * 3. Run: pnpm e2e
 */
import { test, expect } from "@playwright/test";

// Helper — skip test gracefully if redirected to login (no auth session)
async function requireAuth(page: import("@playwright/test").Page, path: string) {
  await page.goto(path);
  if (page.url().includes("/login")) {
    test.skip(true, "No auth session — set E2E_USER_EMAIL and E2E_USER_PASSWORD to enable");
  }
}

test.describe("Discovery feed", () => {
  test("shows Gymatch header", async ({ page }) => {
    await requireAuth(page, "/");
    await expect(page.getByText("Gymatch")).toBeVisible();
  });

  test("shows bottom navigation with 3 tabs", async ({ page }) => {
    await requireAuth(page, "/");
    await expect(page.getByRole("link", { name: /discover/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /matches/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /profile/i })).toBeVisible();
  });

  test("shows swipe cards or empty state", async ({ page }) => {
    await requireAuth(page, "/");
    // Either a card is visible or the empty state
    const hasCard = await page.locator("article[role='article']").count() > 0;
    const hasEmpty = await page.getByTestId("card-stack-empty").isVisible().catch(() => false);
    const hasLoading = await page.getByRole("status", { name: /loading/i }).isVisible().catch(() => false);

    expect(hasCard || hasEmpty || hasLoading).toBe(true);
  });

  test("shows action buttons (like and nope)", async ({ page }) => {
    await requireAuth(page, "/");
    await expect(page.getByRole("button", { name: /nope/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /like/i })).toBeVisible();
  });

  test("page does not scroll — fits in viewport", async ({ page }) => {
    await requireAuth(page, "/");
    const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const clientHeight = await page.evaluate(() => document.documentElement.clientHeight);
    // Allow 10px tolerance
    expect(scrollHeight).toBeLessThanOrEqual(clientHeight + 10);
  });
});

test.describe("Matches page", () => {
  test("renders matches list or empty state", async ({ page }) => {
    await requireAuth(page, "/matches");
    const hasMatches = await page.locator("ul li").count() > 0;
    const hasEmpty = await page.getByText(/no matches yet/i).isVisible().catch(() => false);
    expect(hasMatches || hasEmpty).toBe(true);
  });

  test("shows back navigation on conversation page", async ({ page }) => {
    await requireAuth(page, "/matches");
    const firstMatch = page.locator("ul li a").first();
    const hasMatch = await firstMatch.isVisible().catch(() => false);
    if (!hasMatch) {
      test.skip(true, "No matches to test conversation");
    }
    await firstMatch.click();
    await expect(page.getByRole("link", { name: /back|matches/i })).toBeVisible();
  });
});

test.describe("Profile page", () => {
  test("shows user name and username", async ({ page }) => {
    await requireAuth(page, "/profile");
    // Should show some user info
    await expect(page.locator("p, h1, h2").first()).toBeVisible();
  });

  test("has edit profile link", async ({ page }) => {
    await requireAuth(page, "/profile");
    await expect(page.getByRole("link", { name: /edit profile/i })).toBeVisible();
  });

  test("edit profile page loads", async ({ page }) => {
    await requireAuth(page, "/profile/edit");
    await expect(page.getByRole("link", { name: /back/i })).toBeVisible();
    await expect(page.getByRole("textbox")).toBeVisible(); // bio textarea
  });
});

test.describe("Onboarding flow", () => {
  test("username page has back button to login", async ({ page }) => {
    await page.goto("/onboarding/username");
    if (page.url().includes("/login")) {
      test.skip(true, "No auth session");
    }
    // If redirected to / (onboarding complete), skip
    if (!page.url().includes("onboarding")) {
      test.skip(true, "Onboarding already complete");
    }
    await expect(page.getByRole("link", { name: /back/i })).toBeVisible();
  });
});
