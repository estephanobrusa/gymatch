import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

// ── Mock prismaAdmin ──────────────────────────────────────────────────────
vi.mock("@/lib/auth/admin", () => ({
  prismaAdmin: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

// ── Imports after mocks ───────────────────────────────────────────────────
import { countCompatibleTrainers } from "../compatibility";
import { prismaAdmin } from "@/lib/auth/admin";

const mockUserFindUnique = (prismaAdmin.user as unknown as { findUnique: Mock }).findUnique;
const mockUserFindMany = (prismaAdmin.user as unknown as { findMany: Mock }).findMany;

// ── Fixtures ──────────────────────────────────────────────────────────────

function makeUser(
  id: string,
  opts: {
    city?: string | null;
    gymId?: string | null;
    slots?: { day: string; startTime: string; endTime?: string | null }[];
  } = {}
) {
  return {
    id,
    city: opts.city ?? null,
    gymId: opts.gymId ?? null,
    scheduleSlots: (opts.slots ?? []).map((slot) => ({
      id: `${id}-slot`,
      userId: id,
      day: slot.day,
      startTime: slot.startTime,
      endTime: slot.endTime ?? null,
      activity: "training",
      gymId: null,
      createdAt: new Date(),
    })),
  };
}

const viewer = makeUser("viewer", {
  city: "Madrid",
  gymId: "gym-1",
  slots: [{ day: "MONDAY", startTime: "18:00", endTime: "19:00" }],
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("countCompatibleTrainers", () => {
  it("counts a candidate with same day + overlapping time + same gym", async () => {
    mockUserFindUnique.mockResolvedValue(viewer);
    mockUserFindMany.mockResolvedValue([
      makeUser("cand-gym", {
        gymId: "gym-1",
        slots: [{ day: "MONDAY", startTime: "18:30", endTime: "19:30" }],
      }),
    ]);

    await expect(countCompatibleTrainers("viewer")).resolves.toBe(1);
  });

  it("counts a candidate with same day + overlapping time + same city", async () => {
    mockUserFindUnique.mockResolvedValue(viewer);
    mockUserFindMany.mockResolvedValue([
      makeUser("cand-city", {
        city: "Madrid",
        slots: [{ day: "MONDAY", startTime: "18:15", endTime: "18:45" }],
      }),
    ]);

    await expect(countCompatibleTrainers("viewer")).resolves.toBe(1);
  });

  it("does not count a candidate with non-overlapping times on the same day", async () => {
    mockUserFindUnique.mockResolvedValue(viewer);
    mockUserFindMany.mockResolvedValue([
      makeUser("cand-nonoverlap", {
        gymId: "gym-1",
        slots: [{ day: "MONDAY", startTime: "20:00", endTime: "21:00" }],
      }),
    ]);

    await expect(countCompatibleTrainers("viewer")).resolves.toBe(0);
  });

  it("does not count a candidate whose slots are on a different day", async () => {
    mockUserFindUnique.mockResolvedValue(viewer);
    mockUserFindMany.mockResolvedValue([
      makeUser("cand-otherday", {
        gymId: "gym-1",
        slots: [{ day: "TUESDAY", startTime: "18:00", endTime: "19:00" }],
      }),
    ]);

    await expect(countCompatibleTrainers("viewer")).resolves.toBe(0);
  });

  it("counts a candidate with two matching slots only once", async () => {
    mockUserFindUnique.mockResolvedValue(viewer);
    mockUserFindMany.mockResolvedValue([
      makeUser("cand-multi", {
        gymId: "gym-1",
        slots: [
          { day: "MONDAY", startTime: "18:00", endTime: "19:00" },
          { day: "MONDAY", startTime: "18:30", endTime: "19:30" },
        ],
      }),
    ]);

    await expect(countCompatibleTrainers("viewer")).resolves.toBe(1);
  });

  it("returns 0 when the viewer is missing", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    await expect(countCompatibleTrainers("ghost")).resolves.toBe(0);
    expect(mockUserFindMany).not.toHaveBeenCalled();
  });
});
