"use server";

import { getUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/auth/admin";
import type { Prisma } from "@prisma/client";

// Valid ReportReason enum values (mirrors the Prisma enum)
const VALID_REPORT_REASONS = [
  "FAKE_PROFILE",
  "HARASSMENT",
  "SEXUAL_CONTENT",
  "SPAM",
  "UNDERAGE",
  "OFFENSIVE_BEHAVIOR",
] as const;

export type ReportReason = (typeof VALID_REPORT_REASONS)[number];

type ActionResult = { success: true } | { error: string };

/**
 * Returns the DB user id for the currently authenticated user.
 * Returns null if unauthenticated or missing from DB.
 * (Unlike chat/actions.ts, we return null instead of redirecting
 *  so server actions can return structured error objects.)
 */
async function resolveCurrentUserId(): Promise<string | null> {
  const authUser = await getUser();
  if (!authUser) return null;

  const dbUser = await prismaAdmin.user.findUnique({
    where: { supabaseId: authUser.id },
    select: { id: true },
  });

  return dbUser?.id ?? null;
}

/**
 * Blocks a target user.
 * Creates a Block row with { fromId: currentUserId, toId: targetId }.
 * Handles P2002 (already blocked) gracefully.
 */
export async function blockUserAction(targetId: string): Promise<ActionResult> {
  const currentUserId = await resolveCurrentUserId();
  if (!currentUserId) return { error: "auth" };

  try {
    await prismaAdmin.block.create({
      data: { fromId: currentUserId, toId: targetId },
    });
    return { success: true };
  } catch (err: unknown) {
    if (isPrismaError(err, "P2002")) {
      return { error: "already_blocked" };
    }
    throw err;
  }
}

/**
 * Unblocks a target user.
 * Deletes the Block row { fromId: currentUserId, toId: targetId }.
 * Idempotent — removing a block that does not exist is a success.
 */
export async function unblockUserAction(targetId: string): Promise<ActionResult> {
  const currentUserId = await resolveCurrentUserId();
  if (!currentUserId) return { error: "auth" };

  await prismaAdmin.block.deleteMany({
    where: { fromId: currentUserId, toId: targetId },
  });
  return { success: true };
}

/**
 * Reports a target user with a given reason.
 * Validates the reason against the ReportReason enum before touching the DB.
 * Creates a Report row with { reporterId: currentUserId, targetId, reason }
 * AND automatically unmatches: any match between the reporter and the target
 * is deleted, so the reported user leaves the reporter's chat immediately.
 *
 * Before unmatching, the last 20 messages of the shared conversation are
 * captured as `evidence` on the report — otherwise the cascade delete of the
 * match would destroy the evidence admins need to review the case.
 *
 * Both operations run atomically in a transaction — if the user already
 * reported this target (P2002), nothing is deleted.
 * Handles P2002 (duplicate report) gracefully.
 */
export async function reportUserAction(
  targetId: string,
  reason: ReportReason
): Promise<ActionResult> {
  // Validate reason before auth or DB calls
  if (!isValidReportReason(reason)) {
    return { error: "invalid_reason" };
  }

  const currentUserId = await resolveCurrentUserId();
  if (!currentUserId) return { error: "auth" };

  try {
    await prismaAdmin.$transaction(async (tx) => {
      // Capture evidence BEFORE unmatching: find the shared conversation and
      // snapshot its last messages, since the match delete cascades to them.
      const match = await tx.match.findFirst({
        where: {
          OR: [
            { userAId: currentUserId, userBId: targetId },
            { userAId: targetId, userBId: currentUserId },
          ],
        },
        select: {
          conversations: {
            take: 1,
            orderBy: { createdAt: "desc" },
            select: { id: true },
          },
        },
      });

      let evidence: Prisma.InputJsonValue | null = null;
      const conversationId = match?.conversations[0]?.id;
      if (conversationId) {
        const messages = await tx.message.findMany({
          where: { conversationId },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: { senderId: true, body: true, createdAt: true },
        });
        // Return in chronological order (oldest first) for the transcript
        evidence = {
          messages: messages.reverse().map((m) => ({
            senderId: m.senderId,
            body: m.body,
            createdAt: m.createdAt.toISOString(),
          })),
        };
      }

      const reportData: Prisma.ReportUncheckedCreateInput = {
        reporterId: currentUserId,
        targetId,
        reason,
      };
      if (evidence) reportData.evidence = evidence;

      await tx.report.create({ data: reportData });

      // Auto-unmatch: remove any match in either direction so the reported
      // user leaves the reporter's chat (deleteMany: no match = no-op).
      await tx.match.deleteMany({
        where: {
          OR: [
            { userAId: currentUserId, userBId: targetId },
            { userAId: targetId, userBId: currentUserId },
          ],
        },
      });
    });
    return { success: true };
  } catch (err: unknown) {
    if (isPrismaError(err, "P2002")) {
      return { error: "already_reported" };
    }
    throw err;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function isValidReportReason(value: unknown): value is ReportReason {
  return VALID_REPORT_REASONS.includes(value as ReportReason);
}

function isPrismaError(err: unknown, code: string): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === code
  );
}

// ── Admin review ──────────────────────────────────────────────────────────

export type ReviewDecision = "WARN" | "BAN" | "DISMISS";

const VALID_REVIEW_DECISIONS: ReviewDecision[] = ["WARN", "BAN", "DISMISS"];

/**
 * Resolves the DB user for the currently authenticated user AND verifies
 * they hold the ADMIN role. Returns null for non-admins (no redirect —
 * server actions return structured errors).
 */
export async function resolveAdminUserId(): Promise<string | null> {
  const authUser = await getUser();
  if (!authUser) return null;

  const dbUser = await prismaAdmin.user.findUnique({
    where: { supabaseId: authUser.id },
    select: { id: true, role: true },
  });

  return dbUser?.role === "ADMIN" ? dbUser.id : null;
}

/**
 * Reviews a pending report as an admin.
 *
 * Decisions:
 *   - WARN    → marks the report WARNED, no account change
 *   - BAN     → marks the report BANNED and sets target.bannedAt (account
 *               loses access and disappears from discovery/event lists)
 *   - DISMISS → marks the report DISMISSED, no account change
 *
 * The report must be PENDING; already-resolved reports cannot be re-reviewed.
 * Optional note is recorded on the report for case history.
 */
export async function reviewReportAction(
  reportId: string,
  decision: ReviewDecision,
  note?: string
): Promise<ActionResult> {
  if (!VALID_REVIEW_DECISIONS.includes(decision)) {
    return { error: "invalid_decision" };
  }

  const adminId = await resolveAdminUserId();
  if (!adminId) return { error: "forbidden" };

  const report = await prismaAdmin.report.findUnique({
    where: { id: reportId },
    select: { id: true, status: true, targetId: true },
  });
  if (!report) return { error: "not_found" };
  if (report.status !== "PENDING") return { error: "already_reviewed" };

  const status = decision === "WARN" ? "WARNED" : decision === "BAN" ? "BANNED" : "DISMISSED";

  await prismaAdmin.$transaction([
    prismaAdmin.report.update({
      where: { id: reportId },
      data: {
        status,
        note: note?.trim() || null,
        resolvedById: adminId,
        resolvedAt: new Date(),
      },
    }),
    ...(status === "BANNED"
      ? [
          prismaAdmin.user.update({
            where: { id: report.targetId },
            data: { bannedAt: new Date() },
          }),
          // A new ban resets previous appeals: the user must appeal THIS ban.
          // Otherwise /banned would keep showing a stale ACCEPTED appeal.
          prismaAdmin.appeal.deleteMany({
            where: { userId: report.targetId },
          }),
        ]
      : []),
  ]);

  return { success: true };
}

// ── Appeals ────────────────────────────────────────────────────────────────

const MAX_APPEAL_LENGTH = 2000;

/**
 * Resolves the DB user row for the current session (any role).
 * Returns null when unauthenticated or missing from DB.
 */
async function resolveDbUserId(): Promise<string | null> {
  const authUser = await getUser();
  if (!authUser) return null;

  const dbUser = await prismaAdmin.user.findUnique({
    where: { supabaseId: authUser.id },
    select: { id: true },
  });

  return dbUser?.id ?? null;
}

/**
 * Submits an appeal for the authenticated user.
 * Requires the user to currently be banned.
 * Only one appeal per user — a second submission returns "already_appealed".
 */
export async function submitAppealAction(reason: string): Promise<ActionResult> {
  const userId = await resolveDbUserId();
  if (!userId) return { error: "auth" };

  const trimmed = reason.trim();
  if (!trimmed) return { error: "empty_reason" };
  if (trimmed.length > MAX_APPEAL_LENGTH) {
    return { error: "reason_too_long" };
  }

  const user = await prismaAdmin.user.findUnique({
    where: { id: userId },
    select: { bannedAt: true },
  });
  if (!user?.bannedAt) return { error: "not_banned" };

  try {
    await prismaAdmin.appeal.create({
      data: { userId, reason: trimmed },
    });
    return { success: true };
  } catch (err: unknown) {
    if (isPrismaError(err, "P2002")) {
      return { error: "already_appealed" };
    }
    throw err;
  }
}

export type AppealDecision = "ACCEPT" | "REJECT";

const VALID_APPEAL_DECISIONS: AppealDecision[] = ["ACCEPT", "REJECT"];

/**
 * Reviews a pending appeal as an admin.
 *
 * Decisions:
 *   - ACCEPT → appeal marked ACCEPTED and the user's ban is lifted
 *              (bannedAt = null, account access restored)
 *   - REJECT → appeal marked REJECTED, ban stays in place
 *
 * The appeal must be PENDING; already-reviewed appeals cannot be re-reviewed.
 */
export async function reviewAppealAction(
  appealId: string,
  decision: AppealDecision,
  adminNote?: string
): Promise<ActionResult> {
  if (!VALID_APPEAL_DECISIONS.includes(decision)) {
    return { error: "invalid_decision" };
  }

  const adminId = await resolveAdminUserId();
  if (!adminId) return { error: "forbidden" };

  const appeal = await prismaAdmin.appeal.findUnique({
    where: { id: appealId },
    select: { id: true, status: true, userId: true },
  });
  if (!appeal) return { error: "not_found" };
  if (appeal.status !== "PENDING") return { error: "already_reviewed" };

  const status = decision === "ACCEPT" ? "ACCEPTED" : "REJECTED";

  await prismaAdmin.$transaction([
    prismaAdmin.appeal.update({
      where: { id: appealId },
      data: {
        status,
        adminNote: adminNote?.trim() || null,
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
    }),
    ...(status === "ACCEPTED"
      ? [
          prismaAdmin.user.update({
            where: { id: appeal.userId },
            data: { bannedAt: null },
          }),
        ]
      : []),
  ]);

  return { success: true };
}
