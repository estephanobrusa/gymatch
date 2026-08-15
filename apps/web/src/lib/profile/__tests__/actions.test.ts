import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

// ── Mock auth ─────────────────────────────────────────────────────────────
vi.mock("@/lib/auth", () => ({
  getUser: vi.fn(),
}));

// ── Mock prismaAdmin ──────────────────────────────────────────────────────
vi.mock("@/lib/auth/admin", () => ({
  prismaAdmin: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    userPhoto: {
      count: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    scheduleSlot: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// ── Mock Supabase server client ───────────────────────────────────────────
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// ── Imports after mocks ───────────────────────────────────────────────────
import {
  updateProfileAction,
  addPhotoAction,
  deletePhotoAction,
  reorderPhotosAction,
  updateScheduleSlotsAction,
} from "../actions";
import { getUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/auth/admin";
import type { ScheduleSlotInput } from "../types";

const mockGetUser = getUser as Mock;
const mockUserFindUnique = (prismaAdmin.user as unknown as { findUnique: Mock }).findUnique;
const mockUserUpdate = (prismaAdmin.user as unknown as { update: Mock }).update;
const mockPhotoCount = (prismaAdmin.userPhoto as unknown as { count: Mock }).count;
const mockPhotoCreate = (prismaAdmin.userPhoto as unknown as { create: Mock }).create;
const mockPhotoFindFirst = (prismaAdmin.userPhoto as unknown as { findFirst: Mock }).findFirst;
const mockPhotoDelete = (prismaAdmin.userPhoto as unknown as { delete: Mock }).delete;
const mockPhotoFindMany = (prismaAdmin.userPhoto as unknown as { findMany: Mock }).findMany;
const mockSlotDeleteMany = vi.mocked(prismaAdmin.scheduleSlot.deleteMany);
const mockSlotCreateMany = vi.mocked(prismaAdmin.scheduleSlot.createMany);
const mockTransaction = prismaAdmin.$transaction as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  // Default: authenticated as supabase user "sb-u1" mapped to db user "db-u1"
  mockGetUser.mockResolvedValue({ id: "sb-u1" });
  mockUserFindUnique.mockResolvedValue({ id: "db-u1" });
  // Default: $transaction resolves immediately
  mockTransaction.mockResolvedValue([]);
});

// ─────────────────────────────────────────────────────────────────────────
// updateProfileAction
// ─────────────────────────────────────────────────────────────────────────

describe("updateProfileAction", () => {
  it("returns error when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue(null);

    const result = await updateProfileAction({ bio: "Hello" });

    expect(result).toEqual({ error: "Unauthenticated" });
  });

  it("returns success when called with valid partial data", async () => {
    mockUserUpdate.mockResolvedValue({});

    const result = await updateProfileAction({
      bio: "New bio",
      weeklyFrequency: 4,
    });

    expect(result).toEqual({ success: true });
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "db-u1" },
        data: expect.objectContaining({ bio: "New bio", weeklyFrequency: 4 }),
      })
    );
  });

  it("saves minAge and maxAge when both are valid", async () => {
    mockUserUpdate.mockResolvedValue({});

    const result = await updateProfileAction({ minAge: 25, maxAge: 45 });

    expect(result).toEqual({ success: true });
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ minAge: 25, maxAge: 45 }),
      })
    );
  });

  it("returns error when minAge is below 18", async () => {
    const result = await updateProfileAction({ minAge: 17, maxAge: 40 });

    expect(result).toEqual({ error: expect.stringContaining("minAge") });
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("returns error when maxAge exceeds 99", async () => {
    const result = await updateProfileAction({ minAge: 18, maxAge: 100 });

    expect(result).toEqual({ error: expect.stringContaining("maxAge") });
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("returns error when minAge is not less than maxAge", async () => {
    const result = await updateProfileAction({ minAge: 40, maxAge: 40 });

    expect(result).toEqual({ error: expect.stringContaining("minAge") });
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// addPhotoAction
// ─────────────────────────────────────────────────────────────────────────

describe("addPhotoAction", () => {
  it("returns error when user already has 6 photos", async () => {
    mockPhotoCount.mockResolvedValue(6);

    const result = await addPhotoAction("https://example.com/photo.jpg", "db-u1/photo.jpg");

    expect(result).toEqual({ error: "Maximum 6 photos allowed" });
    expect(mockPhotoCreate).not.toHaveBeenCalled();
  });

  it("returns success with photo data when user has fewer than 6 photos", async () => {
    mockPhotoCount.mockResolvedValue(5);
    mockPhotoCreate.mockResolvedValue({
      id: "photo-new",
      url: "https://example.com/photo.jpg",
      position: 5,
    });

    const result = await addPhotoAction("https://example.com/photo.jpg", "db-u1/photo.jpg");

    expect(result).toEqual({
      success: true,
      photo: { id: "photo-new", url: "https://example.com/photo.jpg", position: 5 },
    });
    expect(mockPhotoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "db-u1",
          url: "https://example.com/photo.jpg",
          storagePath: "db-u1/photo.jpg",
          position: 5,
        }),
      })
    );
  });

  it("allows the 6th photo (count=5 → succeeds)", async () => {
    mockPhotoCount.mockResolvedValue(5);
    mockPhotoCreate.mockResolvedValue({
      id: "photo-6",
      url: "https://example.com/6.jpg",
      position: 5,
    });

    const result = await addPhotoAction("https://example.com/6.jpg", "db-u1/6.jpg");

    expect(result).toEqual({
      success: true,
      photo: { id: "photo-6", url: "https://example.com/6.jpg", position: 5 },
    });
  });

  it("rejects the 7th photo (count=6 → error)", async () => {
    mockPhotoCount.mockResolvedValue(6);

    const result = await addPhotoAction("https://example.com/7.jpg", "db-u1/7.jpg");

    expect(result).toEqual({ error: "Maximum 6 photos allowed" });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// deletePhotoAction
// ─────────────────────────────────────────────────────────────────────────

describe("deletePhotoAction", () => {
  it("returns error when photo does not belong to the authenticated user", async () => {
    mockPhotoFindFirst.mockResolvedValue(null);

    const result = await deletePhotoAction("photo-999");

    expect(result).toEqual({ error: "Photo not found or does not belong to you" });
    expect(mockPhotoDelete).not.toHaveBeenCalled();
  });

  it("returns success and deletes from DB when photo has no storagePath (degraded gracefully)", async () => {
    mockPhotoFindFirst.mockResolvedValue({
      id: "photo-1",
      userId: "db-u1",
      url: "https://example.com/photo.jpg",
      storagePath: null,
      position: 0,
    });
    mockPhotoDelete.mockResolvedValue({});
    mockPhotoFindMany.mockResolvedValue([]);

    const result = await deletePhotoAction("photo-1");

    expect(result).toEqual({ success: true });
    expect(mockPhotoDelete).toHaveBeenCalledWith({ where: { id: "photo-1" } });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// reorderPhotosAction
// ─────────────────────────────────────────────────────────────────────────

describe("reorderPhotosAction", () => {
  it("returns error when some photoIds do not belong to the user", async () => {
    // User only owns photo-1, but requests reorder of ["photo-1", "photo-2"]
    mockPhotoFindMany.mockResolvedValue([{ id: "photo-1" }]);

    const result = await reorderPhotosAction(["photo-1", "photo-2"]);

    expect(result).toEqual({ error: "Some photos do not belong to you" });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("returns success and reorders when all photoIds belong to the user", async () => {
    mockPhotoFindMany.mockResolvedValue([{ id: "photo-1" }, { id: "photo-2" }]);

    const result = await reorderPhotosAction(["photo-1", "photo-2"]);

    expect(result).toEqual({ success: true });
    expect(mockTransaction).toHaveBeenCalledOnce();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// updateScheduleSlotsAction
// ─────────────────────────────────────────────────────────────────────────

const VALID_SLOT: ScheduleSlotInput = {
  day: "MONDAY",
  startTime: "18:00",
  endTime: "19:00",
  activity: "BJJ",
  gymId: "gym-1",
};

describe("updateScheduleSlotsAction", () => {
  it("returns error when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue(null);

    const result = await updateScheduleSlotsAction({ slots: [VALID_SLOT] });

    expect(result).toEqual({ error: "Unauthenticated" });
    expect(mockSlotDeleteMany).not.toHaveBeenCalled();
    expect(mockSlotCreateMany).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("saves valid slots by deleting then creating inside a transaction", async () => {
    const result = await updateScheduleSlotsAction({
      slots: [
        VALID_SLOT,
        {
          day: "WEDNESDAY",
          startTime: "07:00",
          endTime: null,
          activity: "Running",
          gymId: null,
        },
      ],
    });

    expect(result).toEqual({ success: true });
    expect(mockSlotDeleteMany).toHaveBeenCalledWith({
      where: { userId: "db-u1" },
    });
    expect(mockSlotCreateMany).toHaveBeenCalledWith({
      data: [
        {
          userId: "db-u1",
          day: "MONDAY",
          startTime: "18:00",
          endTime: "19:00",
          activity: "BJJ",
          gymId: "gym-1",
        },
        {
          userId: "db-u1",
          day: "WEDNESDAY",
          startTime: "07:00",
          activity: "Running",
        },
      ],
    });
    expect(mockTransaction).toHaveBeenCalledOnce();
  });

  it("replaces previous slots by deleting with the right userId", async () => {
    await updateScheduleSlotsAction({ slots: [VALID_SLOT] });

    expect(mockSlotDeleteMany).toHaveBeenCalledWith({
      where: { userId: "db-u1" },
    });
  });

  it("returns error for an invalid startTime format", async () => {
    const result = await updateScheduleSlotsAction({
      slots: [{ ...VALID_SLOT, startTime: "25:99" }],
    });

    expect(result).toEqual({ error: "Invalid startTime, expected HH:mm" });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("returns error when endTime is not after startTime", async () => {
    const result = await updateScheduleSlotsAction({
      slots: [{ ...VALID_SLOT, startTime: "18:00", endTime: "18:00" }],
    });

    expect(result).toEqual({ error: "endTime must be after startTime" });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("returns error for an empty activity", async () => {
    const result = await updateScheduleSlotsAction({
      slots: [{ ...VALID_SLOT, activity: "   " }],
    });

    expect(result).toEqual({ error: "activity is required" });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("returns error when activity exceeds 40 characters", async () => {
    const result = await updateScheduleSlotsAction({
      slots: [{ ...VALID_SLOT, activity: "a".repeat(41) }],
    });

    expect(result).toEqual({ error: "activity must be 40 characters or less" });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("returns error when there are more than 42 slots", async () => {
    const slots = Array.from({ length: 43 }, () => VALID_SLOT);

    const result = await updateScheduleSlotsAction({ slots });

    expect(result).toEqual({ error: "Too many schedule slots (max 42)" });
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});
