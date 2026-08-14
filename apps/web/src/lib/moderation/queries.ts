import { prismaAdmin } from "@/lib/auth/admin";
import type { ReportStatus } from "@prisma/client";

/**
 * Admin-only moderation queries.
 * All functions here assume the caller has already passed `requireAdmin`.
 * Never call from client code — server components/actions only.
 */

export type ReportEvidenceMessage = {
  senderId: string;
  body: string;
  createdAt: string;
};

export type ReportQueueItem = {
  id: string;
  reason: string;
  createdAt: Date;
  evidence: ReportEvidenceMessage[] | null;
  target: {
    id: string;
    name: string;
    username: string | null;
    email: string | null;
    city: string | null;
    bio: string | null;
    bannedAt: Date | null;
    photoUrl: string | null;
    reportCount: number;
  };
  reporters: {
    id: string;
    name: string;
    username: string | null;
  }[];
};

/**
 * Returns the PENDING reports queue, oldest first.
 * Each item groups the target's profile info plus the list of users
 * who reported them and how many total reports the target has.
 */
export async function getReportQueue(): Promise<ReportQueueItem[]> {
  const reports = await prismaAdmin.report.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      reason: true,
      createdAt: true,
      evidence: true,
      target: {
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          city: true,
          bio: true,
          bannedAt: true,
          photos: {
            select: { url: true },
            orderBy: { position: "asc" as const },
            take: 1,
          },
          reportsReceived: {
            select: { reporter: { select: { id: true, name: true, username: true } } },
          },
        },
      },
    },
  });

  return reports.map((report) => ({
    id: report.id,
    reason: report.reason,
    createdAt: report.createdAt,
    evidence:
      report.evidence && typeof report.evidence === "object" && "messages" in report.evidence
        ? (report.evidence as { messages: ReportEvidenceMessage[] }).messages
        : null,
    target: {
      id: report.target.id,
      name: report.target.name,
      username: report.target.username,
      email: report.target.email,
      city: report.target.city,
      bio: report.target.bio,
      bannedAt: report.target.bannedAt,
      photoUrl: report.target.photos[0]?.url ?? null,
      reportCount: report.target.reportsReceived.length,
    },
    reporters: report.target.reportsReceived.map((r) => r.reporter),
  }));
}

export type ResolvedReportItem = {
  id: string;
  reason: string;
  status: ReportStatus;
  note: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
  targetName: string;
  resolvedByName: string | null;
};

/**
 * Returns the case history — reports that already have a decision,
 * most recently resolved first.
 */
export async function getResolvedReports(): Promise<ResolvedReportItem[]> {
  const reports = await prismaAdmin.report.findMany({
    where: { status: { not: "PENDING" } },
    orderBy: { resolvedAt: "desc" },
    take: 100,
    select: {
      id: true,
      reason: true,
      status: true,
      note: true,
      createdAt: true,
      resolvedAt: true,
      target: { select: { name: true } },
      resolvedBy: { select: { name: true } },
    },
  });

  return reports.map((report) => ({
    id: report.id,
    reason: report.reason,
    status: report.status,
    note: report.note,
    createdAt: report.createdAt,
    resolvedAt: report.resolvedAt,
    targetName: report.target.name,
    resolvedByName: report.resolvedBy?.name ?? null,
  }));
}

/**
 * Returns the pending report count for the admin dashboard stat card.
 */
export async function getPendingReportCount(): Promise<number> {
  return prismaAdmin.report.count({ where: { status: "PENDING" } });
}

// ── Appeals ───────────────────────────────────────────────────────────────

export type BlockedUserItem = {
  id: string;
  name: string;
  username: string | null;
  photoUrl: string | null;
  blockedAt: Date;
};

/**
 * Returns the users the current user has blocked, most recently blocked first.
 */
export async function getBlockedUsers(currentUserId: string): Promise<BlockedUserItem[]> {
  const blocks = await prismaAdmin.block.findMany({
    where: { fromId: currentUserId },
    orderBy: { createdAt: "desc" },
    select: {
      createdAt: true,
      to: {
        select: {
          id: true,
          name: true,
          username: true,
          photos: {
            select: { url: true },
            orderBy: { position: "asc" as const },
            take: 1,
          },
        },
      },
    },
  });

  return blocks.map((block) => ({
    id: block.to.id,
    name: block.to.name,
    username: block.to.username,
    photoUrl: block.to.photos[0]?.url ?? null,
    blockedAt: block.createdAt,
  }));
}

export type AppealQueueItem = {
  id: string;
  reason: string;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    username: string | null;
    email: string | null;
    city: string | null;
    photoUrl: string | null;
  };
};

/**
 * Returns PENDING appeals, oldest first — the queue an admin reviews.
 */
export async function getPendingAppeals(): Promise<AppealQueueItem[]> {
  const appeals = await prismaAdmin.appeal.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      reason: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          city: true,
          photos: {
            select: { url: true },
            orderBy: { position: "asc" as const },
            take: 1,
          },
        },
      },
    },
  });

  return appeals.map((appeal) => ({
    id: appeal.id,
    reason: appeal.reason,
    createdAt: appeal.createdAt,
    user: {
      id: appeal.user.id,
      name: appeal.user.name,
      username: appeal.user.username,
      email: appeal.user.email,
      city: appeal.user.city,
      photoUrl: appeal.user.photos[0]?.url ?? null,
    },
  }));
}

export type MyAppeal = {
  id: string;
  reason: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  adminNote: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
};

/**
 * Returns the authenticated user's appeal, or null if they never appealed.
 */
export async function getMyAppeal(userId: string): Promise<MyAppeal | null> {
  const appeal = await prismaAdmin.appeal.findUnique({
    where: { userId },
    select: {
      id: true,
      reason: true,
      status: true,
      adminNote: true,
      createdAt: true,
      reviewedAt: true,
    },
  });

  return appeal;
}
