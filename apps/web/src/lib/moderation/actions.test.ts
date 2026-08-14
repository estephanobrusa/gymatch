import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

/**
 * Unit tests for moderation server actions.
 *
 * Strategy: mock prismaAdmin and auth helpers.
 * We verify:
 *   1. blockUserAction — auth guard, calls block.create, handles P2002 gracefully
 *   2. reportUserAction — auth guard, validates enum, calls report.create, catches P2002
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
      user: { findUnique: vi.fn(), update: vi.fn() },
      block: { create: vi.fn() },
      report: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
      appeal: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
      match: { findFirst: vi.fn(), deleteMany: vi.fn() },
      message: { findMany: vi.fn() },
      $transaction: vi.fn(),
    },
  };
});

import {
  blockUserAction,
  reportUserAction,
  reviewReportAction,
  submitAppealAction,
  reviewAppealAction,
} from "./actions";
import { getUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/auth/admin";

const mockGetUser = getUser as Mock;
const mockUserFindUnique = (prismaAdmin.user as unknown as { findUnique: Mock }).findUnique;
const mockUserUpdate = (prismaAdmin.user as unknown as { update: Mock }).update;
const mockBlockCreate = (prismaAdmin.block as unknown as { create: Mock }).create;
const mockReportCreate = (prismaAdmin.report as unknown as { create: Mock }).create;
const mockReportFindUnique = (prismaAdmin.report as unknown as { findUnique: Mock }).findUnique;
const mockReportUpdate = (prismaAdmin.report as unknown as { update: Mock }).update;
const mockAppealCreate = (prismaAdmin.appeal as unknown as { create: Mock }).create;
const mockAppealFindUnique = (prismaAdmin.appeal as unknown as { findUnique: Mock }).findUnique;
const mockAppealUpdate = (prismaAdmin.appeal as unknown as { update: Mock }).update;
const mockAppealDeleteMany = (prismaAdmin.appeal as unknown as { deleteMany: Mock }).deleteMany;
const mockMatchFindFirst = (prismaAdmin.match as unknown as { findFirst: Mock }).findFirst;
const mockMatchDeleteMany = (prismaAdmin.match as unknown as { deleteMany: Mock }).deleteMany;
const mockMessageFindMany = (prismaAdmin.message as unknown as { findMany: Mock }).findMany;
const mockTransaction = (prismaAdmin as unknown as { $transaction: Mock }).$transaction;

beforeEach(() => {
  vi.clearAllMocks();
  // Default: authenticated as DB user "u1"
  mockGetUser.mockResolvedValue({ id: "supabase-u1" });
  mockUserFindUnique.mockResolvedValue({ id: "u1" });
});

// ─────────────────────────────────────────────────────────────────────────
// blockUserAction
// ─────────────────────────────────────────────────────────────────────────
describe("blockUserAction", () => {
  it("creates a Block row with correct fromId and toId", async () => {
    mockBlockCreate.mockResolvedValue({ id: "block-1" });

    const result = await blockUserAction("u2");

    expect(mockBlockCreate).toHaveBeenCalledWith({
      data: { fromId: "u1", toId: "u2" },
    });
    expect(result).toEqual({ success: true });
  });

  it("returns { error: 'already_blocked' } on P2002 (duplicate block)", async () => {
    const p2002 = Object.assign(new Error("Unique constraint failed"), {
      code: "P2002",
    });
    mockBlockCreate.mockRejectedValue(p2002);

    const result = await blockUserAction("u2");

    expect(result).toEqual({ error: "already_blocked" });
  });

  it("returns auth error when user is unauthenticated", async () => {
    mockGetUser.mockResolvedValue(null);
    mockUserFindUnique.mockResolvedValue(null);

    const result = await blockUserAction("u2");

    expect(mockBlockCreate).not.toHaveBeenCalled();
    expect(result).toEqual({ error: "auth" });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// reportUserAction
// ─────────────────────────────────────────────────────────────────────────
describe("reportUserAction", () => {
  beforeEach(() => {
    // Callback-style transaction: invoke the callback with the mocked client
    mockTransaction.mockImplementation((cb: (tx: typeof prismaAdmin) => Promise<unknown>) =>
      cb(prismaAdmin)
    );
    mockMatchDeleteMany.mockResolvedValue({ count: 1 });
    // Default: no shared match (evidence null)
    mockMatchFindFirst.mockResolvedValue(null);
  });

  it("creates a Report row with reporterId, targetId, and reason", async () => {
    mockReportCreate.mockResolvedValue({ id: "report-1" });

    const result = await reportUserAction("u2", "HARASSMENT");

    expect(mockReportCreate).toHaveBeenCalledWith({
      data: { reporterId: "u1", targetId: "u2", reason: "HARASSMENT" },
    });
    expect(result).toEqual({ success: true });
  });

  it("captures the last 20 messages as evidence before unmatching", async () => {
    mockReportCreate.mockResolvedValue({ id: "report-1" });
    mockMatchFindFirst.mockResolvedValue({
      conversations: [{ id: "conv-1" }],
    });
    mockMessageFindMany.mockResolvedValue([
      // DB returns newest first (orderBy: createdAt desc)
      { senderId: "u2", body: "adios", createdAt: new Date("2026-01-01T10:01:00Z") },
      { senderId: "u1", body: "hola", createdAt: new Date("2026-01-01T10:00:00Z") },
    ]);

    const result = await reportUserAction("u2", "HARASSMENT");

    expect(mockMessageFindMany).toHaveBeenCalledWith({
      where: { conversationId: "conv-1" },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { senderId: true, body: true, createdAt: true },
    });
    expect(mockReportCreate).toHaveBeenCalledWith({
      data: {
        reporterId: "u1",
        targetId: "u2",
        reason: "HARASSMENT",
        evidence: {
          messages: [
            { senderId: "u1", body: "hola", createdAt: "2026-01-01T10:00:00.000Z" },
            { senderId: "u2", body: "adios", createdAt: "2026-01-01T10:01:00.000Z" },
          ],
        },
      },
    });
    expect(result).toEqual({ success: true });
  });

  it("omits evidence when no shared conversation exists", async () => {
    mockReportCreate.mockResolvedValue({ id: "report-1" });
    mockMatchFindFirst.mockResolvedValue(null);

    await reportUserAction("u2", "HARASSMENT");

    expect(mockMessageFindMany).not.toHaveBeenCalled();
    expect(mockReportCreate).toHaveBeenCalledWith({
      data: { reporterId: "u1", targetId: "u2", reason: "HARASSMENT" },
    });
  });

  it("automatically unmatches the reporter and target in both directions", async () => {
    mockReportCreate.mockResolvedValue({ id: "report-1" });

    await reportUserAction("u2", "HARASSMENT");

    expect(mockMatchDeleteMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { userAId: "u1", userBId: "u2" },
          { userAId: "u2", userBId: "u1" },
        ],
      },
    });
  });

  it("returns { error: 'already_reported' } on P2002 and does NOT unmatch", async () => {
    const p2002 = Object.assign(new Error("Unique constraint failed"), {
      code: "P2002",
    });
    mockReportCreate.mockRejectedValue(p2002);

    const result = await reportUserAction("u2", "SPAM");

    expect(result).toEqual({ error: "already_reported" });
    expect(mockMatchDeleteMany).not.toHaveBeenCalled();
  });

  it("returns { error: 'invalid_reason' } for an invalid ReportReason value", async () => {
    const result = await reportUserAction("u2", "TOTALLY_INVALID" as never);

    expect(mockReportCreate).not.toHaveBeenCalled();
    expect(result).toEqual({ error: "invalid_reason" });
  });

  it("returns auth error when user is unauthenticated", async () => {
    mockGetUser.mockResolvedValue(null);
    mockUserFindUnique.mockResolvedValue(null);

    const result = await reportUserAction("u2", "SPAM");

    expect(mockReportCreate).not.toHaveBeenCalled();
    expect(result).toEqual({ error: "auth" });
  });

  it("accepts all 6 valid ReportReason values", async () => {
    mockReportCreate.mockResolvedValue({ id: "report-x" });

    const reasons = [
      "FAKE_PROFILE",
      "HARASSMENT",
      "SEXUAL_CONTENT",
      "SPAM",
      "UNDERAGE",
      "OFFENSIVE_BEHAVIOR",
    ] as const;

    for (const reason of reasons) {
      mockReportCreate.mockClear();
      const result = await reportUserAction("u2", reason);
      expect(result).toEqual({ success: true });
      expect(mockReportCreate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ reason }) })
      );
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// reviewReportAction
// ─────────────────────────────────────────────────────────────────────────
describe("reviewReportAction", () => {
  beforeEach(() => {
    // Default: admin role with DB id "admin-1"
    mockGetUser.mockResolvedValue({ id: "supabase-admin" });
    mockUserFindUnique.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    mockReportFindUnique.mockResolvedValue({
      id: "report-1",
      status: "PENDING",
      targetId: "u2",
    });
    mockReportUpdate.mockResolvedValue({});
    mockUserUpdate.mockResolvedValue({});
    mockAppealDeleteMany.mockResolvedValue({ count: 0 });
    mockTransaction.mockImplementation((ops: unknown[]) => Promise.resolve(ops));
  });

  it("returns forbidden for non-admin users", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "u1", role: "USER" });

    const result = await reviewReportAction("report-1", "BAN");

    expect(result).toEqual({ error: "forbidden" });
    expect(mockReportUpdate).not.toHaveBeenCalled();
  });

  it("returns forbidden when unauthenticated", async () => {
    mockGetUser.mockResolvedValue(null);

    const result = await reviewReportAction("report-1", "WARN");

    expect(result).toEqual({ error: "forbidden" });
  });

  it("returns invalid_decision for an unknown decision", async () => {
    const result = await reviewReportAction("report-1", "DELETE" as never);

    expect(result).toEqual({ error: "invalid_decision" });
    expect(mockReportFindUnique).not.toHaveBeenCalled();
  });

  it("returns not_found when the report does not exist", async () => {
    mockReportFindUnique.mockResolvedValue(null);

    const result = await reviewReportAction("report-1", "WARN");

    expect(result).toEqual({ error: "not_found" });
  });

  it("returns already_reviewed for a resolved report", async () => {
    mockReportFindUnique.mockResolvedValue({
      id: "report-1",
      status: "WARNED",
      targetId: "u2",
    });

    const result = await reviewReportAction("report-1", "WARN");

    expect(result).toEqual({ error: "already_reviewed" });
  });

  it("marks a report WARNED without banning the target", async () => {
    const result = await reviewReportAction("report-1", "WARN", "First warning");

    expect(result).toEqual({ success: true });
    expect(mockReportUpdate).toHaveBeenCalledWith({
      where: { id: "report-1" },
      data: expect.objectContaining({
        status: "WARNED",
        note: "First warning",
        resolvedById: "admin-1",
        resolvedAt: expect.any(Date),
      }),
    });
    // WARN must NOT ban — user.update never called
    expect(mockUserUpdate).not.toHaveBeenCalled();
    // Transaction contains exactly the report update
    expect(mockTransaction).toHaveBeenCalledWith([expect.anything()]);
  });

  it("marks a report BANNED and sets bannedAt on the target", async () => {
    const result = await reviewReportAction("report-1", "BAN");

    expect(result).toEqual({ success: true });
    expect(mockReportUpdate).toHaveBeenCalledWith({
      where: { id: "report-1" },
      data: expect.objectContaining({ status: "BANNED" }),
    });
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "u2" },
      data: { bannedAt: expect.any(Date) },
    });
    // A new ban must reset previous appeals so the user can appeal THIS ban
    expect(mockAppealDeleteMany).toHaveBeenCalledWith({
      where: { userId: "u2" },
    });
    // Transaction contains all three ops
    expect(mockTransaction).toHaveBeenCalledWith([
      expect.anything(),
      expect.anything(),
      expect.anything(),
    ]);
  });

  it("marks a report DISMISSED without banning the target", async () => {
    const result = await reviewReportAction("report-1", "DISMISS");

    expect(result).toEqual({ success: true });
    expect(mockReportUpdate).toHaveBeenCalledWith({
      where: { id: "report-1" },
      data: expect.objectContaining({ status: "DISMISSED" }),
    });
    expect(mockUserUpdate).not.toHaveBeenCalled();
    expect(mockTransaction).toHaveBeenCalledWith([expect.anything()]);
  });

  it("trims the note and stores null when empty", async () => {
    await reviewReportAction("report-1", "WARN", "   ");

    expect(mockReportUpdate).toHaveBeenCalledWith({
      where: { id: "report-1" },
      data: expect.objectContaining({ note: null }),
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// submitAppealAction
// ─────────────────────────────────────────────────────────────────────────
describe("submitAppealAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: authenticated as DB user "u1", currently banned
    mockGetUser.mockResolvedValue({ id: "supabase-u1" });
    mockUserFindUnique.mockResolvedValue({ id: "u1", bannedAt: new Date() });
    mockAppealCreate.mockResolvedValue({ id: "appeal-1" });
  });

  it("creates an appeal with the trimmed reason for a banned user", async () => {
    const result = await submitAppealAction("  I was framed  ");

    expect(result).toEqual({ success: true });
    expect(mockAppealCreate).toHaveBeenCalledWith({
      data: { userId: "u1", reason: "I was framed" },
    });
  });

  it("returns auth error when unauthenticated", async () => {
    mockGetUser.mockResolvedValue(null);

    const result = await submitAppealAction("Please");

    expect(result).toEqual({ error: "auth" });
    expect(mockAppealCreate).not.toHaveBeenCalled();
  });

  it("returns empty_reason for whitespace-only input", async () => {
    const result = await submitAppealAction("   ");

    expect(result).toEqual({ error: "empty_reason" });
    expect(mockAppealCreate).not.toHaveBeenCalled();
  });

  it("returns reason_too_long for input over 2000 chars", async () => {
    const result = await submitAppealAction("x".repeat(2001));

    expect(result).toEqual({ error: "reason_too_long" });
    expect(mockAppealCreate).not.toHaveBeenCalled();
  });

  it("returns not_banned when the user is not banned", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "u1", bannedAt: null });

    const result = await submitAppealAction("Please");

    expect(result).toEqual({ error: "not_banned" });
    expect(mockAppealCreate).not.toHaveBeenCalled();
  });

  it("returns already_appealed on P2002 (duplicate appeal)", async () => {
    const p2002 = Object.assign(new Error("Unique constraint failed"), {
      code: "P2002",
    });
    mockAppealCreate.mockRejectedValue(p2002);

    const result = await submitAppealAction("Please");

    expect(result).toEqual({ error: "already_appealed" });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// reviewAppealAction
// ─────────────────────────────────────────────────────────────────────────
describe("reviewAppealAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: admin role with DB id "admin-1"
    mockGetUser.mockResolvedValue({ id: "supabase-admin" });
    mockUserFindUnique.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    mockAppealFindUnique.mockResolvedValue({
      id: "appeal-1",
      status: "PENDING",
      userId: "u2",
    });
    mockAppealUpdate.mockResolvedValue({});
    mockUserUpdate.mockResolvedValue({});
    mockTransaction.mockImplementation((ops: unknown[]) => Promise.resolve(ops));
  });

  it("returns forbidden for non-admin users", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "u1", role: "USER" });

    const result = await reviewAppealAction("appeal-1", "ACCEPT");

    expect(result).toEqual({ error: "forbidden" });
    expect(mockAppealUpdate).not.toHaveBeenCalled();
  });

  it("returns invalid_decision for an unknown decision", async () => {
    const result = await reviewAppealAction("appeal-1", "DELETE" as never);

    expect(result).toEqual({ error: "invalid_decision" });
    expect(mockAppealFindUnique).not.toHaveBeenCalled();
  });

  it("returns not_found when the appeal does not exist", async () => {
    mockAppealFindUnique.mockResolvedValue(null);

    const result = await reviewAppealAction("appeal-1", "ACCEPT");

    expect(result).toEqual({ error: "not_found" });
  });

  it("returns already_reviewed for a resolved appeal", async () => {
    mockAppealFindUnique.mockResolvedValue({
      id: "appeal-1",
      status: "REJECTED",
      userId: "u2",
    });

    const result = await reviewAppealAction("appeal-1", "ACCEPT");

    expect(result).toEqual({ error: "already_reviewed" });
  });

  it("accepts an appeal and lifts the ban (bannedAt = null)", async () => {
    const result = await reviewAppealAction("appeal-1", "ACCEPT", "OK, welcome back");

    expect(result).toEqual({ success: true });
    expect(mockAppealUpdate).toHaveBeenCalledWith({
      where: { id: "appeal-1" },
      data: expect.objectContaining({
        status: "ACCEPTED",
        adminNote: "OK, welcome back",
        reviewedById: "admin-1",
        reviewedAt: expect.any(Date),
      }),
    });
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "u2" },
      data: { bannedAt: null },
    });
    // Transaction contains both ops
    expect(mockTransaction).toHaveBeenCalledWith([
      expect.anything(),
      expect.anything(),
    ]);
  });

  it("rejects an appeal and keeps the ban in place", async () => {
    const result = await reviewAppealAction("appeal-1", "REJECT", "Denied");

    expect(result).toEqual({ success: true });
    expect(mockAppealUpdate).toHaveBeenCalledWith({
      where: { id: "appeal-1" },
      data: expect.objectContaining({ status: "REJECTED" }),
    });
    // REJECT must NOT lift the ban — user.update never called
    expect(mockUserUpdate).not.toHaveBeenCalled();
    // Transaction contains exactly the appeal update
    expect(mockTransaction).toHaveBeenCalledWith([expect.anything()]);
  });
});
