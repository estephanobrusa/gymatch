import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

/**
 * Unit tests for recordSwipe (server action).
 *
 * Strategy: mock prismaAdmin.$transaction and auth helpers.
 * We verify:
 *   1. Swipe upsert is called with correct args
 *   2. Mutual LIKE creates Match with min/max ordering + Conversation
 *   3. PASS direction never creates a Match
 *   4. Ordering invariant: userAId = lexicographic min of the two IDs
 *   5. SUPER_LIKE direction throws FeatureFlagError when flag is off
 */

// ── Mock next/navigation ──────────────────────────────────────────────────
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

// ── Mock auth before import ───────────────────────────────────────────────
vi.mock("@/lib/auth", () => ({
  getUser: vi.fn(),
}));

// ── Mock prismaAdmin using a factory that references no outer variables ───
vi.mock("@/lib/auth/admin", () => {
  const $transaction = vi.fn();
  const userFindUnique = vi.fn();
  return {
    prismaAdmin: {
      $transaction,
      user: { findUnique: userFindUnique },
    },
  };
});

import { recordSwipe } from "./actions";
import { getUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/auth/admin";

const mockGetUser = getUser as Mock;
const mockTransaction = prismaAdmin.$transaction as Mock;
const mockUserFindUnique = (prismaAdmin.user as { findUnique: Mock }).findUnique;

// ── Helper: build a transaction context and wire $transaction ─────────────
function makeTransactionCtx(opts?: {
  reverseSwipe?: object | null;
}) {
  const swipeUpsertMock = vi.fn().mockResolvedValue({ id: "swipe-1" });
  const swipeFindFirstMock = vi.fn().mockResolvedValue(
    opts?.reverseSwipe !== undefined ? opts.reverseSwipe : null
  );
  const matchCreateMock = vi.fn().mockResolvedValue({ id: "match-1" });
  const convCreateMock = vi.fn().mockResolvedValue({ id: "conv-1" });
  const notificationCreateMock = vi.fn().mockResolvedValue({ id: "notif-1" });
  const txUserFindUniqueMock = vi.fn().mockResolvedValue({
    id: "u2",
    name: "User u2",
    photos: [],
  });

  const tx = {
    swipe: { upsert: swipeUpsertMock, findFirst: swipeFindFirstMock },
    match: { create: matchCreateMock },
    conversation: { create: convCreateMock },
    notification: { create: notificationCreateMock },
    user: { findUnique: txUserFindUniqueMock },
  };

  mockTransaction.mockImplementation(async (fn: (tx: typeof tx) => unknown) => fn(tx));

  return { tx, swipeUpsertMock, swipeFindFirstMock, matchCreateMock, convCreateMock, notificationCreateMock };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: authenticated as DB user "u1"
  mockGetUser.mockResolvedValue({ id: "supabase-u1" });
  mockUserFindUnique.mockResolvedValue({ id: "u1" });
});

describe("recordSwipe", () => {
  it("calls swipe.upsert with correct direction inside $transaction", async () => {
    const { swipeUpsertMock } = makeTransactionCtx();

    await recordSwipe("u2", "LIKE");

    expect(swipeUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { fromId_toId: { fromId: "u1", toId: "u2" } },
        update: { direction: "LIKE" },
        create: expect.objectContaining({ direction: "LIKE", toId: "u2" }),
      })
    );
  });

  it("creates Match and Conversation on mutual LIKE, returns { matched: true }", async () => {
    const { matchCreateMock, convCreateMock } = makeTransactionCtx({
      reverseSwipe: { id: "swipe-rev", fromId: "u2", toId: "u1", direction: "LIKE" },
    });

    const result = await recordSwipe("u2", "LIKE");

    expect(matchCreateMock).toHaveBeenCalledOnce();
    expect(convCreateMock).toHaveBeenCalledOnce();
    expect(result.matched).toBe(true);
    expect(result.matchId).toBeDefined();
  });

  it("creates a NEW_MATCH notification for the OTHER user on mutual LIKE", async () => {
    const { notificationCreateMock } = makeTransactionCtx({
      reverseSwipe: { id: "swipe-rev", fromId: "u2", toId: "u1", direction: "LIKE" },
    });

    await recordSwipe("u2", "LIKE");

    expect(notificationCreateMock).toHaveBeenCalledWith({
      data: {
        userId: "u2",
        type: "NEW_MATCH",
        actorId: "u1",
        matchId: "match-1",
      },
    });
  });

  it("does NOT create a notification when direction is PASS", async () => {
    const { notificationCreateMock } = makeTransactionCtx({
      reverseSwipe: { id: "swipe-rev", fromId: "u2", toId: "u1", direction: "LIKE" },
    });

    await recordSwipe("u2", "PASS");

    expect(notificationCreateMock).not.toHaveBeenCalled();
  });

  it("does NOT create Match when direction is PASS, returns { matched: false }", async () => {
    const { matchCreateMock } = makeTransactionCtx({
      reverseSwipe: { id: "swipe-rev", fromId: "u2", toId: "u1", direction: "LIKE" },
    });

    const result = await recordSwipe("u2", "PASS");

    expect(matchCreateMock).not.toHaveBeenCalled();
    expect(result.matched).toBe(false);
  });

  it("enforces min/max ordering: userAId = lexicographic min of fromId and toId", async () => {
    // Session user is "u-zzz", they swipe "u-aaa"
    // fromId="u-zzz" > toId="u-aaa", so userAId must be "u-aaa"
    mockGetUser.mockResolvedValue({ id: "supabase-u-zzz" });
    mockUserFindUnique.mockResolvedValue({ id: "u-zzz" });

    const { matchCreateMock } = makeTransactionCtx({
      reverseSwipe: { id: "swipe-rev", fromId: "u-aaa", toId: "u-zzz", direction: "LIKE" },
    });

    await recordSwipe("u-aaa", "LIKE");

    expect(matchCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userAId: "u-aaa", // min("u-zzz", "u-aaa")
          userBId: "u-zzz",
        }),
      })
    );
  });

  it("throws FeatureFlagError when SUPER_LIKE is passed and flag is off", async () => {
    delete process.env.NEXT_PUBLIC_FEATURE_SUPER_LIKE;

    await expect(
      recordSwipe("u2", "SUPER_LIKE" as never)
    ).rejects.toThrow("Super Like not available");
  });
});
