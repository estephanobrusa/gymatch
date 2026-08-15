import { prismaAdmin } from "@/lib/auth/admin";
import type { Prisma } from "@prisma/client";

export type ActionResult = { success: true } | { error: string };

// Valid ReportReason enum values (mirrors the Prisma enum)
export const VALID_REPORT_REASONS = [
  "FAKE_PROFILE",
  "HARASSMENT",
  "SEXUAL_CONTENT",
  "SPAM",
  "UNDERAGE",
  "OFFENSIVE_BEHAVIOR",
] as const;

export type ReportReason = (typeof VALID_REPORT_REASONS)[number];

export function isValidReportReason(value: unknown): value is ReportReason {
  return VALID_REPORT_REASONS.includes(value as ReportReason);
}

export function isPrismaError(err: unknown, code: string): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === code
  );
}

/**
 * Blocks a target user.
 * Creates a Block row with { fromId: userId, toId: targetId }.
 * Handles P2002 (already blocked) gracefully.
 *
 * Shared by the server action (blockUserAction) and the REST handler
 * (POST /api/v1/moderation/block).
 */
export async function blockUser(userId: string, targetId: string): Promise<ActionResult> {
  try {
    await prismaAdmin.block.create({
      data: { fromId: userId, toId: targetId },
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
 * Reports a target user with a given reason.
 * Validates the reason against the ReportReason enum before touching the DB.
 * Creates a Report row with { reporterId, targetId, reason } AND automatically
 * unmatches: any match between reporter and target is deleted, so the reported
 * user leaves the reporter's chat immediately.
 *
 * Before unmatching, the last 20 messages of the shared conversation are
 * captured as `evidence` on the report — otherwise the cascade delete of the
 * match would destroy the evidence admins need to review the case.
 *
 * Both operations run atomically in a transaction — if the user already
 * reported this target (P2002), nothing is deleted.
 * Handles P2002 (duplicate report) gracefully.
 *
 * Shared by the server action (reportUserAction) and the REST handler
 * (POST /api/v1/moderation/report).
 */
export async function reportUser(
  userId: string,
  targetId: string,
  reason: ReportReason
): Promise<ActionResult> {
  // Validate reason before auth or DB calls
  if (!isValidReportReason(reason)) {
    return { error: "invalid_reason" };
  }

  try {
    await prismaAdmin.$transaction(async (tx) => {
      // Capture evidence BEFORE unmatching: find the shared conversation and
      // snapshot its last messages, since the match delete cascades to them.
      const match = await tx.match.findFirst({
        where: {
          OR: [
            { userAId: userId, userBId: targetId },
            { userAId: targetId, userBId: userId },
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
        reporterId: userId,
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
            { userAId: userId, userBId: targetId },
            { userAId: targetId, userBId: userId },
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