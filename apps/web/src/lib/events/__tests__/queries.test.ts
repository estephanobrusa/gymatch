import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

// ── Mock prismaAdmin ──────────────────────────────────────────────────────
vi.mock("@/lib/auth/admin", () => ({
  prismaAdmin: {
    user: {
      findUnique: vi.fn(),
    },
    event: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  getUser: vi.fn(),
}));

// ── Imports after mocks ───────────────────────────────────────────────────
import {
  getCurrentUserId,
  getCurrentUserProfileFilter,
  getEventById,
  getFilteredEvents,
  getMyEvents,
  getUpcomingEvents,
  getUpcomingEventsForGym,
} from "../queries";
import { getUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/auth/admin";
import type { EventWithRelations } from "@gymatch/core";

const mockFindMany = (prismaAdmin.event as unknown as { findMany: Mock }).findMany;
const mockFindUnique = (prismaAdmin.event as unknown as { findUnique: Mock }).findUnique;
const mockFindUniqueUser = (prismaAdmin.user as unknown as { findUnique: Mock }).findUnique;
const mockGetUser = getUser as Mock;

function makeEvent(
  overrides: Partial<EventWithRelations> = {}
): EventWithRelations {
  return {
    id: "event-1",
    title: "Sunday open mat",
    type: "OPEN_MAT",
    description: null,
    startsAt: new Date("2099-09-01T18:00:00.000Z"),
    endsAt: null,
    location: null,
    gymId: null,
    capacity: null,
    price: 0,
    creatorId: "db-u1",
    createdAt: new Date(),
    updatedAt: new Date(),
    creator: { id: "db-u1", name: "Jane", username: "jane", photos: [] },
    gym: null,
    _count: { rsvps: 3 },
    ...overrides,
  } as EventWithRelations;
}

function makeGymWithCoords(
  lat: number,
  lng: number,
  id = "gym-1",
  name = "Gym"
): EventWithRelations["gym"] {
  return { id, name, lat, lng } as EventWithRelations["gym"];
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────
// getUpcomingEvents
// ─────────────────────────────────────────────────────────────────────────

describe("getUpcomingEvents", () => {
  it("filters to upcoming events (startsAt >= now) and orders ascending", async () => {
    mockFindMany.mockResolvedValue([makeEvent()]);

    const events = await getUpcomingEvents();

    expect(events).toHaveLength(1);
    const firstCall = mockFindMany.mock.calls[0]?.[0];
    expect(firstCall?.where?.startsAt?.gte).toBeInstanceOf(Date);
    expect(firstCall?.orderBy?.startsAt).toBe("asc");
    expect(firstCall?.take).toBe(20);
  });

  it("uses the provided limit", async () => {
    mockFindMany.mockResolvedValue([]);

    await getUpcomingEvents(5);

    const firstCall = mockFindMany.mock.calls[0]?.[0];
    expect(firstCall?.take).toBe(5);
  });

  it("returns events with their rsvp count", async () => {
    mockFindMany.mockResolvedValue([makeEvent()]);

    const events = await getUpcomingEvents();

    expect(events[0]?._count.rsvps).toBe(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// getUpcomingEventsForGym
// ─────────────────────────────────────────────────────────────────────────

describe("getUpcomingEventsForGym", () => {
  it("filters events by gymId", async () => {
    mockFindMany.mockResolvedValue([makeEvent()]);

    const events = await getUpcomingEventsForGym("gym-1");

    expect(events).toHaveLength(1);
    const firstCall = mockFindMany.mock.calls[0]?.[0];
    expect(firstCall?.where?.gymId).toBe("gym-1");
    expect(firstCall?.where?.startsAt?.gte).toBeInstanceOf(Date);
    expect(firstCall?.orderBy?.startsAt).toBe("asc");
  });
});

// ─────────────────────────────────────────────────────────────────────────
// getMyEvents
// ─────────────────────────────────────────────────────────────────────────

describe("getMyEvents", () => {
  it("filters events by creatorId", async () => {
    mockFindMany.mockResolvedValue([makeEvent()]);

    await getMyEvents("db-u1");

    const firstCall = mockFindMany.mock.calls[0]?.[0];
    expect(firstCall?.where?.creatorId).toBe("db-u1");
  });

  it("orders events by startsAt descending and uses the default limit", async () => {
    mockFindMany.mockResolvedValue([makeEvent()]);

    await getMyEvents("db-u1");

    const firstCall = mockFindMany.mock.calls[0]?.[0];
    expect(firstCall?.orderBy?.startsAt).toBe("desc");
    expect(firstCall?.take).toBe(50);
  });

  it("uses the provided limit", async () => {
    mockFindMany.mockResolvedValue([]);

    await getMyEvents("db-u1", 10);

    const firstCall = mockFindMany.mock.calls[0]?.[0];
    expect(firstCall?.take).toBe(10);
  });

  it("returns the user's events", async () => {
    mockFindMany.mockResolvedValue([makeEvent()]);

    const events = await getMyEvents("db-u1");

    expect(events).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// getCurrentUserId
// ─────────────────────────────────────────────────────────────────────────

describe("getCurrentUserId", () => {
  it("returns the DB user id when authenticated", async () => {
    mockGetUser.mockResolvedValue({ id: "sup-u1" });
    mockFindUniqueUser.mockResolvedValue({ id: "db-u1" });

    const userId = await getCurrentUserId();

    expect(userId).toBe("db-u1");
    expect(mockFindUniqueUser).toHaveBeenCalledWith({
      where: { supabaseId: "sup-u1" },
      select: { id: true },
    });
  });

  it("returns null when unauthenticated", async () => {
    mockGetUser.mockResolvedValue(null);

    const userId = await getCurrentUserId();

    expect(userId).toBeNull();
    expect(mockFindUniqueUser).not.toHaveBeenCalled();
  });

  it("returns null when the auth user is not synced to a DB user", async () => {
    mockGetUser.mockResolvedValue({ id: "sup-u1" });
    mockFindUniqueUser.mockResolvedValue(null);

    const userId = await getCurrentUserId();

    expect(userId).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// getEventById
// ─────────────────────────────────────────────────────────────────────────

describe("getEventById", () => {
  it("returns null when the event does not exist", async () => {
    mockFindUnique.mockResolvedValue(null);

    const event = await getEventById("event-ghost");

    expect(event).toBeNull();
  });

  it("returns the event with nested rsvps and attendee profiles", async () => {
    mockFindUnique.mockResolvedValue({
      ...makeEvent(),
      description: "Details",
      rsvps: [
        {
          id: "rsvp-1",
          user: { id: "db-u2", name: "Bob", username: "bob", city: "Lisbon", gym: null, photos: [] },
        },
      ],
    });

    const event = await getEventById("event-1");

    expect(event?.rsvps).toHaveLength(1);
    expect(event?.rsvps[0]?.user.name).toBe("Bob");
    expect(mockFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "event-1" } })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────
// getFilteredEvents
// ─────────────────────────────────────────────────────────────────────────

const baseFilter = { userId: "db-u1" };

describe("getFilteredEvents", () => {
  it("filters by event type via where.type.in", async () => {
    mockFindMany.mockResolvedValue([makeEvent()]);

    await getFilteredEvents({ ...baseFilter, types: ["SEMINAR", "WORKSHOP"] });

    const firstCall = mockFindMany.mock.calls[0]?.[0];
    expect(firstCall?.where?.startsAt?.gte).toBeInstanceOf(Date);
    expect(firstCall?.where?.type).toEqual({ in: ["SEMINAR", "WORKSHOP"] });
    expect(firstCall?.orderBy?.startsAt).toBe("asc");
    expect(firstCall?.take).toBe(21);
  });

  it("filters by disciplines via where.disciplines.hasSome", async () => {
    mockFindMany.mockResolvedValue([makeEvent()]);

    await getFilteredEvents({ ...baseFilter, disciplines: ["CROSSFIT", "YOGA"] });

    const firstCall = mockFindMany.mock.calls[0]?.[0];
    expect(firstCall?.where?.disciplines).toEqual({ hasSome: ["CROSSFIT", "YOGA"] });
  });

  it("adds no optional filters when lists are empty", async () => {
    mockFindMany.mockResolvedValue([makeEvent()]);

    await getFilteredEvents(baseFilter);

    const firstCall = mockFindMany.mock.calls[0]?.[0];
    expect(firstCall?.where?.type).toBeUndefined();
    expect(firstCall?.where?.disciplines).toBeUndefined();
    expect(firstCall?.where?.city).toBeUndefined();
  });

  it("applies a keyset cursor when provided", async () => {
    mockFindMany.mockResolvedValue([]);

    await getFilteredEvents({ ...baseFilter, cursor: "event-9" });

    const firstCall = mockFindMany.mock.calls[0]?.[0];
    expect(firstCall?.where?.id).toEqual({ gt: "event-9" });
  });

  it("paginates: returns limit events and a nextCursor when more remain", async () => {
    mockFindMany.mockResolvedValue(
      Array.from({ length: 8 }, (_, i) => makeEvent({ id: `e-${i}` }))
    );

    const result = await getFilteredEvents({ ...baseFilter, limit: 5 });

    expect(result.events).toHaveLength(5);
    expect(result.events.map((e) => e.id)).toEqual(["e-0", "e-1", "e-2", "e-3", "e-4"]);
    expect(result.nextCursor).toBe("e-4");
  });

  it("returns no cursor when the page is the last one", async () => {
    mockFindMany.mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => makeEvent({ id: `e-${i}` }))
    );

    const result = await getFilteredEvents({ ...baseFilter, limit: 5 });

    expect(result.events).toHaveLength(5);
    expect(result.nextCursor).toBeNull();
  });

  it("nearMe: filters by the viewer's city via Prisma where", async () => {
    mockFindUniqueUser.mockResolvedValue({
      id: "db-u1",
      city: "Lisbon",
      maxDistance: 25,
      gym: null,
    });
    mockFindMany.mockResolvedValue([makeEvent()]);

    const result = await getFilteredEvents({ ...baseFilter, nearMe: true });

    const firstCall = mockFindMany.mock.calls[0]?.[0];
    expect(firstCall?.where?.city).toBe("Lisbon");
    expect(result.events).toHaveLength(1);
  });

  it("nearMe: keeps nearby gym events and drops far or gymless ones", async () => {
    mockFindUniqueUser.mockResolvedValue({
      id: "db-u1",
      city: null,
      maxDistance: 25,
      gym: { lat: -34.6037, lng: -58.3816 },
    });
    mockFindMany.mockResolvedValue([
      makeEvent({ id: "near", gym: makeGymWithCoords(-34.62, -58.4, "g-near") }),
      makeEvent({ id: "far", gym: makeGymWithCoords(-32.9468, -60.6393, "g-far") }),
      makeEvent({ id: "gymless", gym: null }),
    ]);

    const result = await getFilteredEvents({ ...baseFilter, nearMe: true });

    expect(result.events.map((e) => e.id)).toEqual(["near"]);
    expect(mockFindMany).toHaveBeenCalledTimes(1);
  });

  it("nearMe: respects the user's maxDistance over the 25km default", async () => {
    mockFindUniqueUser.mockResolvedValue({
      id: "db-u1",
      city: null,
      maxDistance: 300,
      gym: { lat: -34.6037, lng: -58.3816 },
    });
    mockFindMany.mockResolvedValue([
      makeEvent({ id: "far", gym: makeGymWithCoords(-32.9468, -60.6393, "g-far") }),
    ]);

    const result = await getFilteredEvents({ ...baseFilter, nearMe: true });

    expect(result.events.map((e) => e.id)).toEqual(["far"]);
  });

  it("nearMe: returns an empty feed when the user has no city and no gym coords", async () => {
    mockFindUniqueUser.mockResolvedValue({
      id: "db-u1",
      city: null,
      maxDistance: 25,
      gym: null,
    });

    const result = await getFilteredEvents({ ...baseFilter, nearMe: true });

    expect(result).toEqual({ events: [], nextCursor: null });
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("nearMe: returns an empty feed when the user does not exist", async () => {
    mockFindUniqueUser.mockResolvedValue(null);

    const result = await getFilteredEvents({ ...baseFilter, nearMe: true });

    expect(result).toEqual({ events: [], nextCursor: null });
    expect(mockFindMany).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// getCurrentUserProfileFilter
// ─────────────────────────────────────────────────────────────────────────

describe("getCurrentUserProfileFilter", () => {
  it("returns the user's disciplines, city and gym coordinates", async () => {
    mockGetUser.mockResolvedValue({ id: "sup-u1" });
    mockFindUniqueUser.mockResolvedValue({
      disciplines: ["CROSSFIT", "YOGA"],
      city: "Lisbon",
      gym: { id: "gym-1", lat: -34.6037, lng: -58.3816 },
    });

    const result = await getCurrentUserProfileFilter();

    expect(result).toEqual({
      disciplines: ["CROSSFIT", "YOGA"],
      city: "Lisbon",
      gymLatLng: { lat: -34.6037, lng: -58.3816 },
      hasGym: true,
    });
  });

  it("returns null gymLatLng and hasGym true when the gym lacks coordinates", async () => {
    mockGetUser.mockResolvedValue({ id: "sup-u1" });
    mockFindUniqueUser.mockResolvedValue({
      disciplines: [],
      city: null,
      gym: { id: "gym-1", lat: null, lng: null },
    });

    const result = await getCurrentUserProfileFilter();

    expect(result?.gymLatLng).toBeNull();
    expect(result?.hasGym).toBe(true);
  });

  it("returns null when unauthenticated", async () => {
    mockGetUser.mockResolvedValue(null);

    expect(await getCurrentUserProfileFilter()).toBeNull();
  });
});