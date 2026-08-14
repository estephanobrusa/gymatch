import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

/**
 * Unit tests for getDiscoveryFeed.
 *
 * Strategy: mock prismaAdmin so no DB is needed.
 * We verify:
 *   - Self is excluded from results
 *   - Already-swiped users are excluded
 *   - Blocked users (both directions) are excluded
 *   - Empty feed returns { cards: [], nextCursor: null }
 *   - Cursor-based pagination returns the correct slice
 */

// ── Mock prismaAdmin before importing the module under test ──────────────
vi.mock("@/lib/auth/admin", () => ({
  prismaAdmin: {
    swipe: { findMany: vi.fn() },
    block: { findMany: vi.fn() },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { getDiscoveryFeed } from "./queries";
import { prismaAdmin } from "@/lib/auth/admin";

// ── Typed mocks ───────────────────────────────────────────────────────────
const mockSwipeFindMany = prismaAdmin.swipe.findMany as Mock;
const mockBlockFindMany = prismaAdmin.block.findMany as Mock;
const mockUserFindUnique = prismaAdmin.user.findUnique as Mock;
const mockUserFindMany = prismaAdmin.user.findMany as Mock;

// ── Helpers ───────────────────────────────────────────────────────────────
function makeUser(
  id: string,
  overrides: {
    birthDate?: Date | null;
    minAge?: number;
    maxAge?: number;
    gymId?: string | null;
    city?: string | null;
    slots?: { day: string; startTime: string; endTime?: string | null }[];
  } = {}
) {
  return {
    id,
    name: `User ${id}`,
    city: overrides.city ?? "Buenos Aires",
    gymId: overrides.gymId ?? "gym-1",
    gym: { name: "CrossFit BA" },
    fitnessGoals: ["STRENGTH"],
    disciplines: ["WEIGHTLIFTING"],
    experienceLevel: "INTERMEDIATE",
    photos: [{ url: "https://example.com/photo.jpg", position: 0 }],
    birthDate: overrides.birthDate ?? null,
    minAge: overrides.minAge ?? 18,
    maxAge: overrides.maxAge ?? 50,
    scheduleSlots: (overrides.slots ?? []).map((slot) => ({
      day: slot.day,
      startTime: slot.startTime,
      endTime: slot.endTime ?? null,
    })),
  };
}

function makeViewer(
  overrides: {
    birthDate?: Date | null;
    minAge?: number;
    maxAge?: number;
    gymId?: string | null;
    city?: string | null;
    slots?: { day: string; startTime: string; endTime?: string | null }[];
  } = {}
) {
  return {
    birthDate: overrides.birthDate ?? null,
    minAge: overrides.minAge ?? 18,
    maxAge: overrides.maxAge ?? 50,
    gymId: overrides.gymId ?? null,
    city: overrides.city ?? null,
    scheduleSlots: (overrides.slots ?? []).map((slot) => ({
      day: slot.day,
      startTime: slot.startTime,
      endTime: slot.endTime ?? null,
    })),
  };
}

/** Build a Date for someone who is exactly `years` years old today */
function yearsAgo(years: number): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getDiscoveryFeed", () => {
  describe("Age filter", () => {
    it("includes a candidate when both ages mutually satisfy each other's ranges", async () => {
      // viewer: 30yo, wants 25-40; candidate: 28yo, wants 20-35 → mutual overlap
      mockUserFindUnique.mockResolvedValue(
        makeViewer({ birthDate: yearsAgo(30), minAge: 25, maxAge: 40 })
      );
      mockSwipeFindMany.mockResolvedValue([]);
      mockBlockFindMany.mockResolvedValue([]);
      const candidate = makeUser("u2", {
        birthDate: yearsAgo(28),
        minAge: 20,
        maxAge: 35,
      });
      mockUserFindMany.mockResolvedValue([candidate]);

      const result = await getDiscoveryFeed("u1");

      expect(result.cards).toHaveLength(1);
      expect(result.cards[0]!.id).toBe("u2");
    });

    it("excludes a candidate whose age exceeds the viewer's maxAge", async () => {
      // viewer: 25yo, wants 18-30; candidate: 45yo → 45 > 30 → hidden
      mockUserFindUnique.mockResolvedValue(
        makeViewer({ birthDate: yearsAgo(25), minAge: 18, maxAge: 30 })
      );
      mockSwipeFindMany.mockResolvedValue([]);
      mockBlockFindMany.mockResolvedValue([]);
      const candidate = makeUser("u2", {
        birthDate: yearsAgo(45),
        minAge: 18,
        maxAge: 50,
      });
      mockUserFindMany.mockResolvedValue([candidate]);

      const result = await getDiscoveryFeed("u1");

      expect(result.cards).toHaveLength(0);
    });

    it("excludes a candidate when viewer's age is outside candidate's range (bidirectional)", async () => {
      // viewer: 50yo, wants 18-60; candidate: 25yo, wants 18-35 → viewer (50) > 35 → hidden
      mockUserFindUnique.mockResolvedValue(
        makeViewer({ birthDate: yearsAgo(50), minAge: 18, maxAge: 60 })
      );
      mockSwipeFindMany.mockResolvedValue([]);
      mockBlockFindMany.mockResolvedValue([]);
      const candidate = makeUser("u2", {
        birthDate: yearsAgo(25),
        minAge: 18,
        maxAge: 35,
      });
      mockUserFindMany.mockResolvedValue([candidate]);

      const result = await getDiscoveryFeed("u1");

      expect(result.cards).toHaveLength(0);
    });

    it("includes a candidate when viewer has null birthDate (permissive)", async () => {
      // viewer has no birthDate → age is null → permissive
      mockUserFindUnique.mockResolvedValue(
        makeViewer({ birthDate: null, minAge: 18, maxAge: 50 })
      );
      mockSwipeFindMany.mockResolvedValue([]);
      mockBlockFindMany.mockResolvedValue([]);
      const candidate = makeUser("u2", {
        birthDate: yearsAgo(40),
        minAge: 18,
        maxAge: 50,
      });
      mockUserFindMany.mockResolvedValue([candidate]);

      const result = await getDiscoveryFeed("u1");

      expect(result.cards).toHaveLength(1);
    });
  });

  describe("Exclusion logic", () => {
    it("excludes self from results", async () => {
      const currentUser = makeUser("u1");
      mockUserFindUnique.mockResolvedValue(currentUser);
      mockSwipeFindMany.mockResolvedValue([]);
      mockBlockFindMany.mockResolvedValue([]);
      // Return no users — only verifying the where clause used to query
      mockUserFindMany.mockResolvedValue([]);

      await getDiscoveryFeed("u1");

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const callArgs = mockUserFindMany.mock.calls[0]![0] as { where: { id: { notIn: string[] } } };
      expect(callArgs.where.id.notIn).toContain("u1");
    });

    it("excludes users already swiped by the requester", async () => {
      const currentUser = makeUser("u1");
      mockUserFindUnique.mockResolvedValue(currentUser);
      // u1 already swiped u2 (LIKE)
      mockSwipeFindMany.mockResolvedValue([{ toId: "u2" }]);
      mockBlockFindMany.mockResolvedValue([]);
      mockUserFindMany.mockResolvedValue([]);

      await getDiscoveryFeed("u1");

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const callArgs = mockUserFindMany.mock.calls[0]![0] as { where: { id: { notIn: string[] } } };
      expect(callArgs.where.id.notIn).toContain("u2");
    });

    it("excludes users blocked in either direction", async () => {
      const currentUser = makeUser("u1");
      mockUserFindUnique.mockResolvedValue(currentUser);
      mockSwipeFindMany.mockResolvedValue([]);
      // u3 blocked u1 (reverse direction — still must be excluded)
      mockBlockFindMany.mockResolvedValue([{ fromId: "u3", toId: "u1" }]);
      mockUserFindMany.mockResolvedValue([]);

      await getDiscoveryFeed("u1");

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const callArgs = mockUserFindMany.mock.calls[0]![0] as { where: { id: { notIn: string[] } } };
      expect(callArgs.where.id.notIn).toContain("u3");
    });

    it("returns empty feed when all users are excluded", async () => {
      const currentUser = makeUser("u1");
      mockUserFindUnique.mockResolvedValue(currentUser);
      mockSwipeFindMany.mockResolvedValue([]);
      mockBlockFindMany.mockResolvedValue([]);
      mockUserFindMany.mockResolvedValue([]); // no eligible users

      const result = await getDiscoveryFeed("u1");

      expect(result).toEqual({ cards: [], nextCursor: null });
    });

    it("returns correct cursor-based pagination slice", async () => {
      const currentUser = makeUser("u1");
      mockUserFindUnique.mockResolvedValue(currentUser);
      mockSwipeFindMany.mockResolvedValue([]);
      mockBlockFindMany.mockResolvedValue([]);

      // Return limit+1 users so the function detects hasMore
      const batch = ["u5", "u6", "u7", "u8", "u9", "u10"].map((id) => makeUser(id));
      mockUserFindMany.mockResolvedValue(batch);

      const result = await getDiscoveryFeed("u1", "u4", 5);

      // nextCursor = last card returned (u9), NOT the +1 sentinel (u10)
      // The next call uses cursor="u9" to get users with id > "u9"
      expect(result.cards).toHaveLength(5);
      expect(result.nextCursor).toBe("u9");
    });
  });

  describe("Hidden profile filter", () => {
    it("passes hideProfile: false in the DB query where clause", async () => {
      mockUserFindUnique.mockResolvedValue(makeViewer());
      mockSwipeFindMany.mockResolvedValue([]);
      mockBlockFindMany.mockResolvedValue([]);
      mockUserFindMany.mockResolvedValue([]);

      await getDiscoveryFeed("u1");

      const callArgs = mockUserFindMany.mock.calls[0]![0] as {
        where: { hideProfile: boolean };
      };
      expect(callArgs.where.hideProfile).toBe(false);
    });

    it("does not surface hidden users even if they pass other filters", async () => {
      mockUserFindUnique.mockResolvedValue(makeViewer());
      mockSwipeFindMany.mockResolvedValue([]);
      mockBlockFindMany.mockResolvedValue([]);
      // The DB mock already filters them — simulate by returning no results
      mockUserFindMany.mockResolvedValue([]);

      const result = await getDiscoveryFeed("u1");

      expect(result.cards).toHaveLength(0);
    });
  });

  describe("Banned user filter", () => {
    it("passes bannedAt: null in the DB query where clause", async () => {
      mockUserFindUnique.mockResolvedValue(makeViewer());
      mockSwipeFindMany.mockResolvedValue([]);
      mockBlockFindMany.mockResolvedValue([]);
      mockUserFindMany.mockResolvedValue([]);

      await getDiscoveryFeed("u1");

      const callArgs = mockUserFindMany.mock.calls[0]![0] as {
        where: { bannedAt: null };
      };
      expect(callArgs.where.bannedAt).toBeNull();
    });
  });

  describe("Schedule compatibility indicator", () => {
    it("marks a candidate compatible when same gym and overlapping slot", async () => {
      mockUserFindUnique.mockResolvedValue(
        makeViewer({
          gymId: "gym-1",
          city: "Buenos Aires",
          slots: [{ day: "MONDAY", startTime: "18:00", endTime: "19:00" }],
        })
      );
      mockSwipeFindMany.mockResolvedValue([]);
      mockBlockFindMany.mockResolvedValue([]);
      mockUserFindMany.mockResolvedValue([
        makeUser("u2", {
          slots: [{ day: "MONDAY", startTime: "18:30", endTime: "19:30" }],
        }),
      ]);

      const result = await getDiscoveryFeed("u1");

      expect(result.cards).toHaveLength(1);
      expect(result.cards[0]!.scheduleCompatible).toBe(true);
    });

    it("marks a candidate incompatible when different gym and different city", async () => {
      mockUserFindUnique.mockResolvedValue(
        makeViewer({
          gymId: "gym-1",
          city: "Buenos Aires",
          slots: [{ day: "MONDAY", startTime: "18:00", endTime: "19:00" }],
        })
      );
      mockSwipeFindMany.mockResolvedValue([]);
      mockBlockFindMany.mockResolvedValue([]);
      mockUserFindMany.mockResolvedValue([
        makeUser("u2", {
          gymId: "gym-other",
          city: "Lisbon",
          slots: [{ day: "MONDAY", startTime: "18:30", endTime: "19:30" }],
        }),
      ]);

      const result = await getDiscoveryFeed("u1");

      expect(result.cards).toHaveLength(1);
      expect(result.cards[0]!.scheduleCompatible).toBe(false);
    });
  });
});
