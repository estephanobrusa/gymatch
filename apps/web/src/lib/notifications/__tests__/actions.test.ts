import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

/**
 * Unit tests for notification server actions.
 *
 * Strategy: mock prismaAdmin and auth helpers.
 * We verify:
 *   1. getNotificationsAction — auth guard, returns previews with actor info
 *   2. markNotificationsReadAction — auth guard, updateMany with correct where
 */

// ── Mock next/navigation ──────────────────────────────────────────────────
// Real next/navigation redirect() throws (NEXT_REDIRECT) to halt execution.
// Simulate that so `if (!user) redirect("/login")` actually stops the flow.
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

// ── Mock auth ─────────────────────────────────────────────────────────────
vi.mock("@/lib/auth", () => ({
  getUser: vi.fn(),
}));

// ── Mock prismaAdmin ──────────────────────────────────────────────────────
vi.mock("@/lib/auth/admin", () => {
  return {
    prismaAdmin: {
      user: { findUnique: vi.fn() },
      notification: {
        findMany: vi.fn(),
        updateMany: vi.fn(),
        count: vi.fn(),
      },
    },
  };
});

import {
  getNotificationsAction,
  getUnreadNotificationsCountAction,
  markNotificationsReadAction,
} from "../actions";
import { getUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/auth/admin";

const mockGetUser = getUser as Mock;
const mockUserFindUnique = (prismaAdmin.user as unknown as { findUnique: Mock }).findUnique;
const mockNotificationFindMany = (
  prismaAdmin.notification as unknown as { findMany: Mock }
).findMany;
const mockNotificationCount = (
  prismaAdmin.notification as unknown as { count: Mock }
).count;
const mockNotificationUpdateMany = (
  prismaAdmin.notification as unknown as { updateMany: Mock }
).updateMany;

beforeEach(() => {
  vi.clearAllMocks();
  // Default: authenticated as DB user "u1"
  mockGetUser.mockResolvedValue({ id: "supabase-u1" });
  mockUserFindUnique.mockResolvedValue({ id: "u1" });
});

// ─────────────────────────────────────────────────────────────────────────
// getNotificationsAction
// ─────────────────────────────────────────────────────────────────────────
describe("getNotificationsAction", () => {
  it("returns notification previews ordered newest-first", async () => {
    mockNotificationFindMany.mockResolvedValue([
      {
        id: "n1",
        type: "NEW_MATCH",
        matchId: "m1",
        conversationId: null,
        readAt: null,
        createdAt: new Date("2026-08-13T10:00:00Z"),
        actor: { id: "u2", name: "Alice", photos: [{ url: "a.jpg", position: 0 }] },
      },
      {
        id: "n2",
        type: "NEW_MESSAGE",
        matchId: null,
        conversationId: "c1",
        readAt: new Date("2026-08-13T09:00:00Z"),
        createdAt: new Date("2026-08-13T09:00:00Z"),
        actor: null,
      },
    ]);

    const result = await getNotificationsAction();

    expect(mockNotificationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "u1" },
        orderBy: { createdAt: "desc" },
      })
    );
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: "n1",
      type: "NEW_MATCH",
      matchId: "m1",
      conversationId: null,
      read: false,
      createdAt: "2026-08-13T10:00:00.000Z",
      actor: { id: "u2", name: "Alice", photoUrl: "a.jpg" },
    });
    expect(result[1]!.read).toBe(true);
    expect(result[1]!.actor).toBeNull();
  });

  it("redirects to login when unauthenticated", async () => {
    mockGetUser.mockResolvedValue(null);

    await expect(getNotificationsAction()).rejects.toThrow("NEXT_REDIRECT:/login");
    const { redirect } = await import("next/navigation");
    expect(redirect).toHaveBeenCalledWith("/login");
    expect(mockNotificationFindMany).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// getUnreadNotificationsCountAction
// ─────────────────────────────────────────────────────────────────────────
describe("getUnreadNotificationsCountAction", () => {
  it("returns the count of unread notifications", async () => {
    mockNotificationCount.mockResolvedValue(5);

    const result = await getUnreadNotificationsCountAction();

    expect(mockNotificationCount).toHaveBeenCalledWith({
      where: { userId: "u1", readAt: null },
    });
    expect(result).toBe(5);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// markNotificationsReadAction
// ─────────────────────────────────────────────────────────────────────────
describe("markNotificationsReadAction", () => {
  it("marks all unread notifications as read for the current user", async () => {
    mockNotificationUpdateMany.mockResolvedValue({ count: 2 });

    await markNotificationsReadAction();

    expect(mockNotificationUpdateMany).toHaveBeenCalledWith({
      where: { userId: "u1", readAt: null },
      data: { readAt: expect.any(Date) },
    });
  });

  it("redirects to login when unauthenticated", async () => {
    mockGetUser.mockResolvedValue(null);

    await expect(markNotificationsReadAction()).rejects.toThrow("NEXT_REDIRECT:/login");
    const { redirect } = await import("next/navigation");
    expect(redirect).toHaveBeenCalledWith("/login");
    expect(mockNotificationUpdateMany).not.toHaveBeenCalled();
  });
});
