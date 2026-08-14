import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

// ── Module mocks ──────────────────────────────────────────────────────────
vi.mock("@/lib/auth", () => ({
  getUser: vi.fn(),
}));

vi.mock("@/lib/auth/admin", () => {
  return {
    prismaAdmin: {
      appSetting: { findUnique: vi.fn(), upsert: vi.fn() },
      waitlistEntry: { findMany: vi.fn(), upsert: vi.fn(), delete: vi.fn() },
      user: { findUnique: vi.fn() },
    },
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import {
  setWaitlistActiveAction,
  removeWaitlistEntryAction,
} from "@/lib/waitlist/actions";
import {
  isWaitlistActive,
  getWaitlistEntries,
  WAITLIST_SETTING_KEY,
} from "@/lib/waitlist/queries";
import { prismaAdmin } from "@/lib/auth/admin";
import { getUser } from "@/lib/auth";

const mockGetUser = getUser as Mock;
const mockSettingFindUnique = (
  prismaAdmin.appSetting as unknown as { findUnique: Mock }
).findUnique;
const mockSettingUpsert = (
  prismaAdmin.appSetting as unknown as { upsert: Mock }
).upsert;
const mockEntryFindMany = (
  prismaAdmin.waitlistEntry as unknown as { findMany: Mock }
).findMany;
const mockEntryDelete = (
  prismaAdmin.waitlistEntry as unknown as { delete: Mock }
).delete;
const mockUserFindUnique = (
  prismaAdmin.user as unknown as { findUnique: Mock }
).findUnique;

// ── Tests ─────────────────────────────────────────────────────────────────

describe("waitlist queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false when no setting row exists", async () => {
    mockSettingFindUnique.mockResolvedValue(null);
    expect(await isWaitlistActive()).toBe(false);
  });

  it("returns true when the setting value is 'true'", async () => {
    mockSettingFindUnique.mockResolvedValue({ value: "true" });
    expect(await isWaitlistActive()).toBe(true);
  });

  it("returns false when the setting value is not 'true'", async () => {
    mockSettingFindUnique.mockResolvedValue({ value: "false" });
    expect(await isWaitlistActive()).toBe(false);
  });

  it("lists entries most recent first", async () => {
    const entries = [
      { id: "e2", email: "b@test.com", name: null, createdAt: new Date("2026-01-02") },
      { id: "e1", email: "a@test.com", name: "Ana", createdAt: new Date("2026-01-01") },
    ];
    mockEntryFindMany.mockResolvedValue(entries);

    expect(await getWaitlistEntries()).toEqual(entries);
    expect(mockEntryFindMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, name: true, createdAt: true },
    });
  });
});

describe("setWaitlistActiveAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ id: "supabase-admin" });
    mockUserFindUnique.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    mockSettingUpsert.mockResolvedValue({});
  });

  it("returns forbidden for non-admin users", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "u1", role: "USER" });

    const result = await setWaitlistActiveAction(true);

    expect(result).toEqual({ error: "forbidden" });
    expect(mockSettingUpsert).not.toHaveBeenCalled();
  });

  it("enables the waitlist and revalidates the dashboard", async () => {
    const result = await setWaitlistActiveAction(true);

    expect(result).toEqual({ success: true });
    expect(mockSettingUpsert).toHaveBeenCalledWith({
      where: { key: WAITLIST_SETTING_KEY },
      update: { value: "true" },
      create: { key: WAITLIST_SETTING_KEY, value: "true" },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("disables the waitlist", async () => {
    await setWaitlistActiveAction(false);

    expect(mockSettingUpsert).toHaveBeenCalledWith({
      where: { key: WAITLIST_SETTING_KEY },
      update: { value: "false" },
      create: { key: WAITLIST_SETTING_KEY, value: "false" },
    });
  });
});

describe("removeWaitlistEntryAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ id: "supabase-admin" });
    mockUserFindUnique.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    mockEntryDelete.mockResolvedValue({});
  });

  it("throws for non-admin users", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "u1", role: "USER" });

    await expect(removeWaitlistEntryAction("e1")).rejects.toThrow("forbidden");
    expect(mockEntryDelete).not.toHaveBeenCalled();
  });

  it("deletes the entry and revalidates the dashboard", async () => {
    await removeWaitlistEntryAction("e1");

    expect(mockEntryDelete).toHaveBeenCalledWith({ where: { id: "e1" } });
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });
});