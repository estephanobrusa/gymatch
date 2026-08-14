import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

/**
 * Unit tests for deleteAccountAction.
 *
 * Strategy: mock auth helpers, prismaAdmin, and the Supabase server client.
 * We verify:
 *   1. Deletes the DB user row (cascade removes photos/matches/messages)
 *   2. Signs out of the Supabase session
 *   3. Returns structured errors when auth fails
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
      user: { delete: vi.fn() },
    },
  };
});

// ── Mock supabase server client ───────────────────────────────────────────
const mockSignOut = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { signOut: mockSignOut },
  })),
}));

import { deleteAccountAction } from "../actions";
import { getUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

const mockGetUser = getUser as Mock;
const mockUserDelete = (prismaAdmin.user as unknown as { delete: Mock }).delete;
const mockCreateClient = createClient as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("deleteAccountAction", () => {
  it("deletes the DB user row and signs out when authenticated", async () => {
    mockGetUser.mockResolvedValue({ id: "supabase-u1", email: "a@b.com" });
    mockUserDelete.mockResolvedValue({ id: "u1" });

    const result = await deleteAccountAction();

    expect(result).toEqual({ success: true });
    expect(mockUserDelete).toHaveBeenCalledWith({ where: { supabaseId: "supabase-u1" } });
    expect(mockCreateClient).toHaveBeenCalled();
    expect(mockSignOut).toHaveBeenCalled();
  });

  it("returns auth error when unauthenticated", async () => {
    mockGetUser.mockResolvedValue(null);

    const result = await deleteAccountAction();

    expect(result).toEqual({ error: "auth" });
    expect(mockUserDelete).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it("returns failed when the delete throws", async () => {
    mockGetUser.mockResolvedValue({ id: "supabase-u1", email: "a@b.com" });
    mockUserDelete.mockRejectedValue(new Error("boom"));

    const result = await deleteAccountAction();

    expect(result).toEqual({ error: "failed" });
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
