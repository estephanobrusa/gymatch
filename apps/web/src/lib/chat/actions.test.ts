import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

/**
 * Unit tests for chat server actions — block-related behavior.
 *
 * Strategy: mock prismaAdmin and auth helpers.
 * We verify:
 *   1. getMatchesAction — excludes matches when a block exists between either party
 *   2. sendMessageAction — rejects message creation when a block exists
 */

// ── Mock next/navigation ──────────────────────────────────────────────────
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
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
      match: { findMany: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
      message: { count: vi.fn(), create: vi.fn() },
      conversation: { findUnique: vi.fn() },
      block: { findFirst: vi.fn() },
      notification: { create: vi.fn() },
    },
  };
});

import { getMatchesAction, sendMessageAction, unmatchAction } from "./actions";
import { getUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/auth/admin";

const mockGetUser = getUser as Mock;
const mockUserFindUnique = (prismaAdmin.user as unknown as { findUnique: Mock }).findUnique;
const mockMatchFindMany = (prismaAdmin.match as unknown as { findMany: Mock }).findMany;
const mockMatchFindUnique = (prismaAdmin.match as unknown as { findUnique: Mock }).findUnique;
const mockMatchDelete = (prismaAdmin.match as unknown as { delete: Mock }).delete;
const mockMessageCount = (prismaAdmin.message as unknown as { count: Mock }).count;
const mockMessageCreate = (prismaAdmin.message as unknown as { create: Mock }).create;
const mockConversationFindUnique = (prismaAdmin.conversation as unknown as { findUnique: Mock }).findUnique;
const mockBlockFindFirst = (prismaAdmin.block as unknown as { findFirst: Mock }).findFirst;
const mockNotificationCreate = (prismaAdmin.notification as unknown as { create: Mock }).create;

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ id: "supabase-u1" });
  mockUserFindUnique.mockResolvedValue({ id: "u1" });
});

// ─────────────────────────────────────────────────────────────────────────
// getMatchesAction — block filter
// ─────────────────────────────────────────────────────────────────────────
describe("getMatchesAction", () => {
  it("passes block filter conditions to match.findMany", async () => {
    mockMatchFindMany.mockResolvedValue([]);

    await getMatchesAction();

    const callArgs = mockMatchFindMany.mock.calls[0]?.[0] as { where?: { AND?: unknown[] } } | undefined;
    const andConditions = callArgs?.where?.AND;

    // The block filter must include AND conditions referencing blocksGiven/blocksReceived
    expect(andConditions).toBeDefined();
    expect(Array.isArray(andConditions)).toBe(true);
    expect(andConditions!.length).toBeGreaterThanOrEqual(4);

    // Verify the filter structure matches design: userA/userB blocksGiven/blocksReceived
    const conditionStr = JSON.stringify(andConditions);
    expect(conditionStr).toContain("blocksGiven");
    expect(conditionStr).toContain("blocksReceived");
  });

  it("returns empty array when no matches exist after block filtering", async () => {
    mockMatchFindMany.mockResolvedValue([]);

    const result = await getMatchesAction();

    expect(result).toEqual([]);
  });

  it("returns match preview when no blocks exist between users", async () => {
    const fakeMatch = {
      id: "match-1",
      userAId: "u1",
      userBId: "u2",
      userA: {
        id: "u1",
        name: "Alice",
        photos: [{ url: "https://example.com/alice.jpg", position: 0 }],
      },
      userB: {
        id: "u2",
        name: "Bob",
        photos: [{ url: "https://example.com/bob.jpg", position: 0 }],
      },
      conversations: [
        {
          id: "conv-1",
          messages: [
            {
              id: "msg-1",
              body: "Hello",
              createdAt: new Date("2026-05-18T10:00:00Z"),
              senderId: "u2",
            },
          ],
        },
      ],
    };
    mockMatchFindMany.mockResolvedValue([fakeMatch]);
    mockMessageCount.mockResolvedValue(1);

    const result = await getMatchesAction();

    expect(result).toHaveLength(1);
    expect(result[0]!.matchId).toBe("match-1");
    expect(result[0]!.matchedUser.id).toBe("u2");
    expect(result[0]!.matchedUser.name).toBe("Bob");
  });
});

// ─────────────────────────────────────────────────────────────────────────
// sendMessageAction — block guard
// ─────────────────────────────────────────────────────────────────────────
describe("sendMessageAction", () => {
  function setupConversation(userAId: string, userBId: string) {
    mockConversationFindUnique.mockResolvedValue({
      id: "conv-1",
      matchId: "match-1",
      match: { userAId, userBId },
    });
  }

  it("throws an error when a block exists in the current-user→other-user direction", async () => {
    setupConversation("u1", "u2");
    mockBlockFindFirst.mockResolvedValue({ id: "block-1", fromId: "u1", toId: "u2" });

    await expect(sendMessageAction("conv-1", "Hello!")).rejects.toThrow("Blocked.");
    expect(mockMessageCreate).not.toHaveBeenCalled();
  });

  it("throws an error when a block exists in the other-user→current-user direction", async () => {
    setupConversation("u1", "u2");
    mockBlockFindFirst.mockResolvedValue({ id: "block-2", fromId: "u2", toId: "u1" });

    await expect(sendMessageAction("conv-1", "Hi!")).rejects.toThrow("Blocked.");
    expect(mockMessageCreate).not.toHaveBeenCalled();
  });

  it("creates message when no block exists", async () => {
    setupConversation("u1", "u2");
    mockBlockFindFirst.mockResolvedValue(null);
    mockMessageCreate.mockResolvedValue({
      id: "msg-new",
      conversationId: "conv-1",
      senderId: "u1",
      body: "Hello!",
      createdAt: new Date("2026-05-18T10:00:00Z"),
    });

    const result = await sendMessageAction("conv-1", "Hello!");

    expect(mockMessageCreate).toHaveBeenCalledOnce();
    expect(result.body).toBe("Hello!");
    expect(result.senderId).toBe("u1");
  });

  it("creates a NEW_MESSAGE notification for the other participant", async () => {
    setupConversation("u1", "u2");
    mockBlockFindFirst.mockResolvedValue(null);
    mockMessageCreate.mockResolvedValue({
      id: "msg-new",
      conversationId: "conv-1",
      senderId: "u1",
      body: "Hello!",
      createdAt: new Date("2026-05-18T10:00:00Z"),
    });

    await sendMessageAction("conv-1", "Hello!");

    expect(mockNotificationCreate).toHaveBeenCalledWith({
      data: {
        userId: "u2",
        type: "NEW_MESSAGE",
        actorId: "u1",
        conversationId: "conv-1",
      },
    });
  });

  it("queries block with correct OR clause covering both directions", async () => {
    setupConversation("u1", "u2");
    mockBlockFindFirst.mockResolvedValue(null);
    mockMessageCreate.mockResolvedValue({
      id: "msg-new",
      conversationId: "conv-1",
      senderId: "u1",
      body: "Test",
      createdAt: new Date("2026-05-18T10:00:00Z"),
    });

    await sendMessageAction("conv-1", "Test");

    const blockCallArgs = mockBlockFindFirst.mock.calls[0]?.[0] as { where: { OR: unknown[] } } | undefined;
    expect(blockCallArgs?.where.OR).toBeDefined();
    expect(blockCallArgs?.where.OR).toHaveLength(2);
    // Both directions must be covered
    const orStr = JSON.stringify(blockCallArgs?.where.OR);
    expect(orStr).toContain('"u1"');
    expect(orStr).toContain('"u2"');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// unmatchAction
// ─────────────────────────────────────────────────────────────────────────
describe("unmatchAction", () => {
  it("returns success and deletes the match when the current user is a participant", async () => {
    mockMatchFindUnique.mockResolvedValue({ id: "match-1", userAId: "u1", userBId: "u2" });
    mockMatchDelete.mockResolvedValue({ id: "match-1", userAId: "u1", userBId: "u2" });

    const result = await unmatchAction("match-1");

    expect(result).toEqual({ success: true });
    expect(mockMatchDelete).toHaveBeenCalledWith({ where: { id: "match-1" } });
  });

  it("returns unauthorized when the current user is not a participant", async () => {
    mockMatchFindUnique.mockResolvedValue({ id: "match-1", userAId: "u9", userBId: "u2" });

    const result = await unmatchAction("match-1");

    expect(result).toEqual({ error: "unauthorized" });
    expect(mockMatchDelete).not.toHaveBeenCalled();
  });

  it("returns not_found when the match does not exist", async () => {
    mockMatchFindUnique.mockResolvedValue(null);

    const result = await unmatchAction("match-1");

    expect(result).toEqual({ error: "not_found" });
    expect(mockMatchDelete).not.toHaveBeenCalled();
  });

  it("returns failed when the delete throws", async () => {
    mockMatchFindUnique.mockResolvedValue({ id: "match-1", userAId: "u1", userBId: "u2" });
    mockMatchDelete.mockRejectedValue(new Error("boom"));

    const result = await unmatchAction("match-1");

    expect(result).toEqual({ error: "failed" });
  });
});
