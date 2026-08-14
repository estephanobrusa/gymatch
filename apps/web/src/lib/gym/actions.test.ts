import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

/**
 * Unit tests for gym server actions.
 *
 * Strategy: mock prismaAdmin, auth helpers, and global fetch.
 * We verify:
 *   1. searchGymsAction — short query returns [], fetch success, fetch error
 *   2. saveGymAction — upsert gym + update user, existing gym reuse
 */

// ── Mocks ─────────────────────────────────────────────────────────────────
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getUser: vi.fn(),
}));

vi.mock("@/lib/auth/admin", () => ({
  prismaAdmin: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    gym: { upsert: vi.fn() },
  },
}));

import { searchGymsAction, saveGymAction } from "./actions";
import { getUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/auth/admin";

const mockGetUser = getUser as Mock;
const mockUserFindUnique = (prismaAdmin.user as unknown as { findUnique: Mock }).findUnique;
const mockUserUpdate = (prismaAdmin.user as unknown as { update: Mock }).update;
const mockGymUpsert = (prismaAdmin.gym as unknown as { upsert: Mock }).upsert;

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ id: "supabase-u1" });
  mockUserFindUnique.mockResolvedValue({ id: "db-u1" });
  // Reset global fetch mock
  vi.stubGlobal("fetch", vi.fn());
});

// ─────────────────────────────────────────────────────────────────────────
// searchGymsAction
// ─────────────────────────────────────────────────────────────────────────
describe("searchGymsAction", () => {
  it("returns empty array immediately when query is less than 2 characters", async () => {
    const result = await searchGymsAction("a");

    expect(result).toEqual([]);
    // fetch must NOT be called for short queries
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns empty array immediately when query is empty string", async () => {
    const result = await searchGymsAction("");

    expect(result).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("calls Google Places API and returns mapped results on success", async () => {
    const mockPlacesResponse = {
      places: [
        {
          id: "place-abc",
          displayName: { text: "Gold's Gym Downtown" },
          formattedAddress: "123 Main St, Buenos Aires",
        },
        {
          id: "place-def",
          displayName: { text: "CrossFit Palermo" },
          formattedAddress: "456 Av. Santa Fe, Buenos Aires",
        },
      ],
    };

    (fetch as Mock).mockResolvedValue({
      ok: true,
      json: async () => mockPlacesResponse,
    });

    // Set env var for the test
    process.env.GOOGLE_PLACES_API_KEY = "test-api-key";

    const result = await searchGymsAction("gym");

    expect(fetch).toHaveBeenCalledOnce();
    expect(result).toHaveLength(2);
    expect(result[0]!.placeId).toBe("place-abc");
    expect(result[0]!.name).toBe("Gold's Gym Downtown");
    expect(result[0]!.address).toBe("123 Main St, Buenos Aires");
    expect(result[1]!.placeId).toBe("place-def");
  });

  it("sends POST to correct endpoint with proper headers and body", async () => {
    (fetch as Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ places: [] }),
    });

    process.env.GOOGLE_PLACES_API_KEY = "my-secret-key";

    await searchGymsAction("crossfit");

    const [url, options] = (fetch as Mock).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://places.googleapis.com/v1/places:searchText");
    expect(options.method).toBe("POST");

    const headers = options.headers as Record<string, string>;
    expect(headers["X-Goog-Api-Key"]).toBe("my-secret-key");
    expect(headers["X-Goog-FieldMask"]).toBe(
      "places.id,places.displayName,places.formattedAddress"
    );

    const body = JSON.parse(options.body as string) as Record<string, unknown>;
    expect(body.textQuery).toBe("crossfit");
    expect(body.includedType).toBe("gym");
  });

  it("returns empty array when fetch throws (network error)", async () => {
    (fetch as Mock).mockRejectedValue(new Error("Network error"));
    process.env.GOOGLE_PLACES_API_KEY = "test-api-key";

    const result = await searchGymsAction("gym");

    expect(result).toEqual([]);
  });

  it("returns empty array when response has no places array", async () => {
    (fetch as Mock).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    process.env.GOOGLE_PLACES_API_KEY = "test-api-key";

    const result = await searchGymsAction("gym near me");

    expect(result).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// saveGymAction
// ─────────────────────────────────────────────────────────────────────────
describe("saveGymAction", () => {
  it("upserts Gym by googlePlaceId and links to current user", async () => {
    const fakeGym = { id: "gym-1", name: "Gold's Gym", googlePlaceId: "place-abc" };
    mockGymUpsert.mockResolvedValue(fakeGym);
    mockUserUpdate.mockResolvedValue({ id: "db-u1", gymId: "gym-1" });

    await saveGymAction("place-abc", "Gold's Gym", "123 Main St");

    expect(mockGymUpsert).toHaveBeenCalledOnce();
    const upsertArgs = mockGymUpsert.mock.calls[0]?.[0] as {
      where: { googlePlaceId: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    };
    expect(upsertArgs.where.googlePlaceId).toBe("place-abc");
    expect(upsertArgs.create.name).toBe("Gold's Gym");
    expect(upsertArgs.create.address).toBe("123 Main St");
    expect(upsertArgs.create.googlePlaceId).toBe("place-abc");
  });

  it("updates user.gymId to the upserted gym's id", async () => {
    const fakeGym = { id: "gym-42", name: "CrossFit Palermo", googlePlaceId: "place-xyz" };
    mockGymUpsert.mockResolvedValue(fakeGym);
    mockUserUpdate.mockResolvedValue({ id: "db-u1", gymId: "gym-42" });

    await saveGymAction("place-xyz", "CrossFit Palermo", "456 Av. Santa Fe");

    expect(mockUserUpdate).toHaveBeenCalledOnce();
    const updateArgs = mockUserUpdate.mock.calls[0]?.[0] as {
      where: { id: string };
      data: { gymId: string };
    };
    expect(updateArgs.where.id).toBe("db-u1");
    expect(updateArgs.data.gymId).toBe("gym-42");
  });

  it("does not create duplicate gym when placeId already exists (upsert semantics)", async () => {
    const existingGym = { id: "gym-existing", name: "Already There", googlePlaceId: "place-dup" };
    // upsert returns existing row — same id
    mockGymUpsert.mockResolvedValue(existingGym);
    mockUserUpdate.mockResolvedValue({ id: "db-u1", gymId: "gym-existing" });

    await saveGymAction("place-dup", "Already There", "789 Some St");

    // Only one upsert call, and the user update links to the existing gym's id
    expect(mockGymUpsert).toHaveBeenCalledOnce();
    const updateArgs = mockUserUpdate.mock.calls[0]?.[0] as {
      data: { gymId: string };
    };
    expect(updateArgs.data.gymId).toBe("gym-existing");
  });

  it("returns success object on completion", async () => {
    mockGymUpsert.mockResolvedValue({ id: "gym-1", name: "Test Gym", googlePlaceId: "place-abc" });
    mockUserUpdate.mockResolvedValue({ id: "db-u1" });

    const result = await saveGymAction("place-abc", "Test Gym", "789 Some St");

    expect(result).toEqual({ success: true });
  });
});
