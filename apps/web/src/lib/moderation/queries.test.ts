import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

/**
 * Unit tests for admin moderation queries.
 *
 * Strategy: mock prismaAdmin so no DB is needed.
 * We verify the queue shape and resolved-history shape.
 */

vi.mock("@/lib/auth/admin", () => ({
  prismaAdmin: {
    report: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    appeal: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

import {
  getReportQueue,
  getResolvedReports,
  getPendingReportCount,
  getPendingAppeals,
  getMyAppeal,
} from "./queries";
import { prismaAdmin } from "@/lib/auth/admin";

const mockReportFindMany = (prismaAdmin.report as unknown as { findMany: Mock }).findMany;
const mockReportCount = (prismaAdmin.report as unknown as { count: Mock }).count;
const mockAppealFindMany = (prismaAdmin.appeal as unknown as { findMany: Mock }).findMany;
const mockAppealFindUnique = (prismaAdmin.appeal as unknown as { findUnique: Mock }).findUnique;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getReportQueue", () => {
  it("queries only PENDING reports, oldest first", async () => {
    mockReportFindMany.mockResolvedValue([]);

    await getReportQueue();

    expect(mockReportFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
      })
    );
  });

  it("maps the target's first photo and report count", async () => {
    mockReportFindMany.mockResolvedValue([
      {
        id: "r1",
        reason: "SPAM",
        createdAt: new Date("2026-01-01"),
        target: {
          id: "u2",
          name: "Jane",
          username: "jane",
          email: "jane@test.com",
          city: "Buenos Aires",
          bio: "Hi",
          bannedAt: null,
          photos: [
            { url: "https://example.com/1.jpg", position: 0 },
            { url: "https://example.com/2.jpg", position: 1 },
          ],
          reportsReceived: [
            { reporter: { id: "u3", name: "Bob", username: "bob" } },
            { reporter: { id: "u4", name: "Al", username: "al" } },
          ],
        },
      },
    ]);

    const queue = await getReportQueue();

    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      id: "r1",
      reason: "SPAM",
      target: {
        id: "u2",
        name: "Jane",
        username: "jane",
        email: "jane@test.com",
        city: "Buenos Aires",
        bio: "Hi",
        bannedAt: null,
        photoUrl: "https://example.com/1.jpg",
        reportCount: 2,
      },
      reporters: [
        { id: "u3", name: "Bob", username: "bob" },
        { id: "u4", name: "Al", username: "al" },
      ],
    });
  });
});

describe("getResolvedReports", () => {
  it("queries only non-PENDING reports, most recently resolved first", async () => {
    mockReportFindMany.mockResolvedValue([]);

    await getResolvedReports();

    expect(mockReportFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: { not: "PENDING" } },
        orderBy: { resolvedAt: "desc" },
      })
    );
  });

  it("maps target and resolver names", async () => {
    mockReportFindMany.mockResolvedValue([
      {
        id: "r1",
        reason: "FAKE_PROFILE",
        status: "BANNED",
        note: "Impersonating a coach",
        createdAt: new Date("2026-01-01"),
        resolvedAt: new Date("2026-01-02"),
        target: { name: "Jane" },
        resolvedBy: { name: "Admin Alex" },
      },
    ]);

    const resolved = await getResolvedReports();

    expect(resolved[0]).toMatchObject({
      id: "r1",
      status: "BANNED",
      note: "Impersonating a coach",
      targetName: "Jane",
      resolvedByName: "Admin Alex",
    });
  });
});

describe("getPendingReportCount", () => {
  it("counts only PENDING reports", async () => {
    mockReportCount.mockResolvedValue(3);

    const count = await getPendingReportCount();

    expect(count).toBe(3);
    expect(mockReportCount).toHaveBeenCalledWith({
      where: { status: "PENDING" },
    });
  });
});

describe("getPendingAppeals", () => {
  it("queries only PENDING appeals, oldest first", async () => {
    mockAppealFindMany.mockResolvedValue([]);

    await getPendingAppeals();

    expect(mockAppealFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
      })
    );
  });

  it("maps the user's first photo", async () => {
    mockAppealFindMany.mockResolvedValue([
      {
        id: "a1",
        reason: "I was framed",
        createdAt: new Date("2026-01-01"),
        user: {
          id: "u2",
          name: "Jane",
          username: "jane",
          email: "jane@test.com",
          city: "Buenos Aires",
          photos: [{ url: "https://example.com/1.jpg", position: 0 }],
        },
      },
    ]);

    const appeals = await getPendingAppeals();

    expect(appeals[0]).toMatchObject({
      id: "a1",
      reason: "I was framed",
      user: {
        id: "u2",
        name: "Jane",
        username: "jane",
        email: "jane@test.com",
        city: "Buenos Aires",
        photoUrl: "https://example.com/1.jpg",
      },
    });
  });
});

describe("getMyAppeal", () => {
  it("returns the user's appeal by userId", async () => {
    const appeal = {
      id: "a1",
      reason: "I was framed",
      status: "PENDING",
      adminNote: null,
      createdAt: new Date("2026-01-01"),
      reviewedAt: null,
    };
    mockAppealFindUnique.mockResolvedValue(appeal);

    const result = await getMyAppeal("u1");

    expect(mockAppealFindUnique).toHaveBeenCalledWith({
      where: { userId: "u1" },
      select: expect.objectContaining({ id: true, status: true }),
    });
    expect(result).toEqual(appeal);
  });

  it("returns null when the user never appealed", async () => {
    mockAppealFindUnique.mockResolvedValue(null);

    const result = await getMyAppeal("u1");

    expect(result).toBeNull();
  });
});
