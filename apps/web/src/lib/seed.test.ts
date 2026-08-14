import { describe, it, expect } from "vitest";

/**
 * Seed helpers — unit tests.
 *
 * These tests verify the pure functions and data constants exported from the
 * seed script WITHOUT touching the database.
 *
 * Path import: relative to apps/web/src/lib/ → root → packages/db/prisma/seed
 */
import {
  photoUrl,
  extractMutualLikes,
  USERS,
  SWIPE_PAIRS,
  PHOTO_POOL,
} from "../../../../packages/db/prisma/seed";

// ─── photoUrl ────────────────────────────────────────────────────────────────

describe("photoUrl", () => {
  it("returns a picsum URL with the given photo id", () => {
    const url = photoUrl("1062");
    expect(url).toBe("https://picsum.photos/id/1062/400/600");
  });

  it("embeds a different id when a different id is passed", () => {
    const url = photoUrl("1074");
    expect(url).toContain("picsum.photos/id/1074");
    expect(url).toContain("400/600");
  });
});

// ─── extractMutualLikes ──────────────────────────────────────────────────────

describe("extractMutualLikes", () => {
  it("returns exactly 4 mutual-LIKE pairs from SWIPE_PAIRS", () => {
    const mutuals = extractMutualLikes(SWIPE_PAIRS);
    expect(mutuals).toHaveLength(4);
  });

  it("returns no pair when there are no LIKEs", () => {
    const mutuals = extractMutualLikes([
      { fromIndex: 0, toIndex: 1, direction: "PASS" },
      { fromIndex: 1, toIndex: 0, direction: "PASS" },
    ]);
    expect(mutuals).toHaveLength(0);
  });

  it("returns 1 pair when exactly one mutual LIKE exists", () => {
    const mutuals = extractMutualLikes([
      { fromIndex: 0, toIndex: 1, direction: "LIKE" },
      { fromIndex: 1, toIndex: 0, direction: "LIKE" },
      { fromIndex: 0, toIndex: 2, direction: "LIKE" }, // one-way
    ]);
    expect(mutuals).toHaveLength(1);
    // The mutual pair must include both indices
    const [pair] = mutuals;
    expect(pair).toContain(0);
    expect(pair).toContain(1);
  });
});

// ─── USERS — birthDate (age >= 18) ───────────────────────────────────────────

describe("USERS birthDates", () => {
  const today = new Date("2026-08-12");

  it("every user is at least 18 years old", () => {
    expect(USERS.length).toBeGreaterThan(0);
    for (const user of USERS) {
      const birth = new Date(user.birthDate);
      const age = today.getFullYear() - birth.getFullYear();
      const hadBirthdayThisYear =
        today.getMonth() > birth.getMonth() ||
        (today.getMonth() === birth.getMonth() &&
          today.getDate() >= birth.getDate());
      const realAge = hadBirthdayThisYear ? age : age - 1;
      expect(realAge, `User ${user.username} is under 18`).toBeGreaterThanOrEqual(18);
    }
  });

  it("has exactly 20 users", () => {
    expect(USERS).toHaveLength(20);
  });
});

// ─── USERS — weeklyFrequency ─────────────────────────────────────────────────

describe("USERS weeklyFrequency", () => {
  it("every user has weeklyFrequency between 1 and 7", () => {
    expect(USERS.length).toBeGreaterThan(0);
    for (const user of USERS) {
      expect(user.weeklyFrequency, `${user.username} weeklyFrequency`).toBeGreaterThanOrEqual(1);
      expect(user.weeklyFrequency, `${user.username} weeklyFrequency`).toBeLessThanOrEqual(7);
    }
  });
});

// ─── USERS — maxDistance ─────────────────────────────────────────────────────

describe("USERS maxDistance", () => {
  it("every user has maxDistance between 5 and 30", () => {
    expect(USERS.length).toBeGreaterThan(0);
    for (const user of USERS) {
      expect(user.maxDistance, `${user.username} maxDistance`).toBeGreaterThanOrEqual(5);
      expect(user.maxDistance, `${user.username} maxDistance`).toBeLessThanOrEqual(30);
    }
  });
});

// ─── USERS — disciplines & fitnessGoals ──────────────────────────────────────

describe("USERS disciplines and fitnessGoals", () => {
  it("every user has at least one discipline", () => {
    expect(USERS.length).toBeGreaterThan(0);
    for (const user of USERS) {
      expect(
        user.disciplines.length,
        `${user.username} has no disciplines`,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it("every user has at least one fitnessGoal", () => {
    expect(USERS.length).toBeGreaterThan(0);
    for (const user of USERS) {
      expect(
        user.fitnessGoals.length,
        `${user.username} has no fitnessGoals`,
      ).toBeGreaterThanOrEqual(1);
    }
  });
});

// ─── USERS — unique usernames ─────────────────────────────────────────────────

describe("USERS usernames", () => {
  it("all usernames are unique", () => {
    const usernames = USERS.map((u) => u.username);
    const unique = new Set(usernames);
    expect(unique.size).toBe(usernames.length);
  });

  it("no username is empty or undefined", () => {
    for (const user of USERS) {
      expect(user.username).toBeTruthy();
    }
  });
});

// ─── PHOTO_POOL ──────────────────────────────────────────────────────────────

describe("PHOTO_POOL", () => {
  it("has at least 10 entries", () => {
    expect(PHOTO_POOL.length).toBeGreaterThanOrEqual(10);
  });

  it("each entry produces a valid photoUrl", () => {
    for (const id of PHOTO_POOL) {
      const url = photoUrl(id);
      expect(url).toMatch(/^https:\/\/picsum\.photos\/id\/\d+\/400\/600$/);
    }
  });
});
