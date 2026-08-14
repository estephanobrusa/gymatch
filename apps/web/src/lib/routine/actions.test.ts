import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

/**
 * Unit tests for routine server actions.
 *
 * Strategy: mock prismaAdmin and auth helpers.
 * We verify:
 *   1. saveRoutineAction — upserts WeeklyRoutine for current user (full + partial)
 *   2. getRoutineAction — returns existing routine or null
 */

// ── Mocks ─────────────────────────────────────────────────────────────────
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getUser: vi.fn(),
}));

vi.mock("@/lib/auth/admin", () => ({
  prismaAdmin: {
    user: { findUnique: vi.fn() },
    weeklyRoutine: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

import { saveRoutineAction, getRoutineAction } from "./actions";
import { getUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/auth/admin";

const mockGetUser = getUser as Mock;
const mockUserFindUnique = (prismaAdmin.user as unknown as { findUnique: Mock }).findUnique;
const mockWeeklyRoutineUpsert = (prismaAdmin.weeklyRoutine as unknown as { upsert: Mock }).upsert;
const mockWeeklyRoutineFindUnique = (prismaAdmin.weeklyRoutine as unknown as { findUnique: Mock }).findUnique;

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ id: "supabase-u1" });
  mockUserFindUnique.mockResolvedValue({ id: "db-u1" });
});

// ─────────────────────────────────────────────────────────────────────────
// saveRoutineAction
// ─────────────────────────────────────────────────────────────────────────
describe("saveRoutineAction", () => {
  it("calls weeklyRoutine.upsert with all 7 days when full routine provided", async () => {
    mockWeeklyRoutineUpsert.mockResolvedValue({ id: "routine-1", userId: "db-u1" });

    const fullData = {
      mon: "CHEST" as const,
      tue: "BACK" as const,
      wed: "LEGS" as const,
      thu: "SHOULDERS" as const,
      fri: "ARMS" as const,
      sat: "FULL_BODY" as const,
      sun: "REST" as const,
    };

    await saveRoutineAction(fullData);

    expect(mockWeeklyRoutineUpsert).toHaveBeenCalledOnce();
    const callArgs = mockWeeklyRoutineUpsert.mock.calls[0]?.[0] as {
      where: { userId: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    };

    expect(callArgs.where.userId).toBe("db-u1");
    expect(callArgs.create.mon).toBe("CHEST");
    expect(callArgs.create.sun).toBe("REST");
    expect(callArgs.update.mon).toBe("CHEST");
    expect(callArgs.update.sun).toBe("REST");
  });

  it("calls weeklyRoutine.upsert with nulls for unset days in partial routine", async () => {
    mockWeeklyRoutineUpsert.mockResolvedValue({ id: "routine-2", userId: "db-u1" });

    const partialData = {
      mon: "CHEST" as const,
      tue: null,
      wed: "LEGS" as const,
      thu: null,
      fri: null,
      sat: null,
      sun: null,
    };

    await saveRoutineAction(partialData);

    expect(mockWeeklyRoutineUpsert).toHaveBeenCalledOnce();
    const callArgs = mockWeeklyRoutineUpsert.mock.calls[0]?.[0] as {
      where: { userId: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    };

    expect(callArgs.create.mon).toBe("CHEST");
    expect(callArgs.create.tue).toBeNull();
    expect(callArgs.create.wed).toBe("LEGS");
    expect(callArgs.create.thu).toBeNull();
    expect(callArgs.create.fri).toBeNull();
    expect(callArgs.create.sat).toBeNull();
    expect(callArgs.create.sun).toBeNull();
  });

  it("includes userId in both create and update payloads", async () => {
    mockWeeklyRoutineUpsert.mockResolvedValue({ id: "routine-1", userId: "db-u1" });

    await saveRoutineAction({
      mon: "CARDIO", tue: null, wed: null, thu: null, fri: null, sat: null, sun: null,
    });

    const callArgs = mockWeeklyRoutineUpsert.mock.calls[0]?.[0] as {
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    };
    expect(callArgs.create.userId).toBe("db-u1");
    // update should NOT include userId (upsert pattern)
    expect(callArgs.update.userId).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// getRoutineAction
// ─────────────────────────────────────────────────────────────────────────
describe("getRoutineAction", () => {
  it("returns null when no routine exists for the user", async () => {
    mockWeeklyRoutineFindUnique.mockResolvedValue(null);

    const result = await getRoutineAction();

    expect(result).toBeNull();
    expect(mockWeeklyRoutineFindUnique).toHaveBeenCalledOnce();
  });

  it("returns the WeeklyRoutine record when it exists", async () => {
    const fakeRoutine = {
      id: "routine-1",
      userId: "db-u1",
      mon: "CHEST",
      tue: "BACK",
      wed: "LEGS",
      thu: "SHOULDERS",
      fri: "ARMS",
      sat: "FULL_BODY",
      sun: "REST",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockWeeklyRoutineFindUnique.mockResolvedValue(fakeRoutine);

    const result = await getRoutineAction();

    expect(result).not.toBeNull();
    expect(result!.userId).toBe("db-u1");
    expect(result!.mon).toBe("CHEST");
    expect(result!.sun).toBe("REST");
  });

  it("queries by the current user's DB id", async () => {
    mockWeeklyRoutineFindUnique.mockResolvedValue(null);

    await getRoutineAction();

    const callArgs = mockWeeklyRoutineFindUnique.mock.calls[0]?.[0] as {
      where: { userId: string };
    };
    expect(callArgs.where.userId).toBe("db-u1");
  });
});
