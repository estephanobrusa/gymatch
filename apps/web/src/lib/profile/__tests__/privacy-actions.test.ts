import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

/**
 * Unit tests for privacy server actions.
 *
 * Strategy: mock prismaAdmin and getUser.
 * We verify:
 *   - setHideProfileAction: auth guard, calls user.update with correct data
 *   - setIncognitoModeAction: auth guard, calls user.update with correct data
 */

// ── Mock next/navigation (required by "use server" module graph) ──────────
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

// ── Mock auth ─────────────────────────────────────────────────────────────
vi.mock("@/lib/auth", () => ({ getUser: vi.fn() }));

// ── Mock supabase/server (referenced by actions.ts imports) ───────────────
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    storage: { from: vi.fn().mockReturnValue({ remove: vi.fn() }) },
  }),
}));

// ── Mock prismaAdmin ──────────────────────────────────────────────────────
vi.mock("@/lib/auth/admin", () => ({
  prismaAdmin: {
    user: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

import { setHideProfileAction, setIncognitoModeAction } from "../actions";
import { getUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/auth/admin";

const mockGetUser = getUser as Mock;
const mockUserFindUnique = prismaAdmin.user.findUnique as Mock;
const mockUserUpdate = prismaAdmin.user.update as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ id: "supabase-u1" });
  mockUserFindUnique.mockResolvedValue({ id: "db-u1" });
  mockUserUpdate.mockResolvedValue({});
});

// ─────────────────────────────────────────────────────────────────────────
// setHideProfileAction
// ─────────────────────────────────────────────────────────────────────────
describe("setHideProfileAction", () => {
  it("sets hideProfile to true", async () => {
    const result = await setHideProfileAction(true);

    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "db-u1" },
      data: { hideProfile: true },
    });
    expect(result).toEqual({ success: true });
  });

  it("sets hideProfile to false (re-enables discovery)", async () => {
    const result = await setHideProfileAction(false);

    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "db-u1" },
      data: { hideProfile: false },
    });
    expect(result).toEqual({ success: true });
  });

  it("returns error when unauthenticated", async () => {
    mockGetUser.mockResolvedValue(null);

    const result = await setHideProfileAction(true);

    expect(mockUserUpdate).not.toHaveBeenCalled();
    expect(result).toEqual({ error: "Unauthenticated" });
  });

  it("returns error when DB user not found", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const result = await setHideProfileAction(true);

    expect(mockUserUpdate).not.toHaveBeenCalled();
    expect(result).toEqual({ error: "User not found" });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// setIncognitoModeAction
// ─────────────────────────────────────────────────────────────────────────
describe("setIncognitoModeAction", () => {
  it("sets incognitoMode to true", async () => {
    const result = await setIncognitoModeAction(true);

    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "db-u1" },
      data: { incognitoMode: true },
    });
    expect(result).toEqual({ success: true });
  });

  it("sets incognitoMode to false (exits incognito)", async () => {
    const result = await setIncognitoModeAction(false);

    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "db-u1" },
      data: { incognitoMode: false },
    });
    expect(result).toEqual({ success: true });
  });

  it("returns error when unauthenticated", async () => {
    mockGetUser.mockResolvedValue(null);

    const result = await setIncognitoModeAction(true);

    expect(mockUserUpdate).not.toHaveBeenCalled();
    expect(result).toEqual({ error: "Unauthenticated" });
  });

  it("returns error when DB user not found", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const result = await setIncognitoModeAction(true);

    expect(mockUserUpdate).not.toHaveBeenCalled();
    expect(result).toEqual({ error: "User not found" });
  });
});
