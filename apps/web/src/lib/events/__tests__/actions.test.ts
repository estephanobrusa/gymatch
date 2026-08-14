import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

// ── Mock auth ─────────────────────────────────────────────────────────────
vi.mock("@/lib/auth", () => ({
  getUser: vi.fn(),
}));

// ── Mock prismaAdmin ──────────────────────────────────────────────────────
vi.mock("@/lib/auth/admin", () => ({
  prismaAdmin: {
    user: {
      findUnique: vi.fn(),
    },
    gym: {
      findUnique: vi.fn(),
    },
    event: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    eventRsvp: {
      findFirst: vi.fn(),
      delete: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// ── Imports after mocks ───────────────────────────────────────────────────
import {
  createEventAction,
  updateEventAction,
  deleteEventAction,
  toggleEventRsvpAction,
} from "../actions";
import type { EventInput } from "../types";
import { getUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/auth/admin";
import type { EventType } from "@prisma/client";

const mockGetUser = getUser as Mock;
const mockUserFindUnique = (prismaAdmin.user as unknown as { findUnique: Mock }).findUnique;
const mockGymFindUnique = (prismaAdmin.gym as unknown as { findUnique: Mock }).findUnique;
const mockEventCreate = (prismaAdmin.event as unknown as { create: Mock }).create;
const mockEventFindUnique = (prismaAdmin.event as unknown as { findUnique: Mock }).findUnique;
const mockEventUpdate = (prismaAdmin.event as unknown as { update: Mock }).update;
const mockEventDelete = (prismaAdmin.event as unknown as { delete: Mock }).delete;
const mockRsvpFindFirst = (prismaAdmin.eventRsvp as unknown as { findFirst: Mock }).findFirst;
const mockRsvpDelete = (prismaAdmin.eventRsvp as unknown as { delete: Mock }).delete;
const mockRsvpCreate = (prismaAdmin.eventRsvp as unknown as { create: Mock }).create;

// ── Fixtures ──────────────────────────────────────────────────────────────

const VALID_INPUT: EventInput = {
  title: "Sunday open mat",
  type: "OPEN_MAT" as EventType,
  startsAt: "2026-09-01T18:00:00.000Z",
  endsAt: "2026-09-01T19:00:00.000Z",
  description: "All levels welcome",
  location: "Rua das Gaivotas 12",
  capacity: 20,
  price: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
  // Default: authenticated as supabase user "sb-u1" mapped to db user "db-u1"
  // who trains at "gym-own" in "Buenos Aires".
  mockGetUser.mockResolvedValue({ id: "sb-u1" });
  mockUserFindUnique.mockResolvedValue({ id: "db-u1", gymId: "gym-own", city: "Buenos Aires" });
  mockGymFindUnique.mockResolvedValue({ city: "Buenos Aires" });
});

// ─────────────────────────────────────────────────────────────────────────
// createEventAction
// ─────────────────────────────────────────────────────────────────────────

describe("createEventAction", () => {
  it("returns error when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue(null);

    const result = await createEventAction(VALID_INPUT);

    expect(result).toEqual({ error: "Unauthenticated" });
    expect(mockEventCreate).not.toHaveBeenCalled();
  });

  it("creates an event at the creator's own gym", async () => {
    mockEventCreate.mockResolvedValue({ id: "event-1" });

    const result = await createEventAction({
      ...VALID_INPUT,
      gymId: "gym-own",
      location: null,
    });

    expect(result).toEqual({ success: true, eventId: "event-1" });
    expect(mockEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Sunday open mat",
          creatorId: "db-u1",
          gymId: "gym-own",
        }),
        select: { id: true },
      })
    );
  });

  it("rejects an event at a gym that is not the creator's", async () => {
    const result = await createEventAction({
      ...VALID_INPUT,
      gymId: "gym-other",
      location: null,
    });

    expect(result).toEqual({ error: "The event must be at your own gym" });
    expect(mockEventCreate).not.toHaveBeenCalled();
  });

  it("rejects a gymless event without a location", async () => {
    const result = await createEventAction({
      ...VALID_INPUT,
      gymId: null,
      location: null,
    });

    expect(result).toEqual({ error: "Location is required for events without a gym" });
    expect(mockEventCreate).not.toHaveBeenCalled();
  });

  it("creates a gymless event with a location", async () => {
    mockEventCreate.mockResolvedValue({ id: "event-1" });

    const result = await createEventAction({
      ...VALID_INPUT,
      gymId: null,
      location: "Parque das Nações",
    });

    expect(result).toEqual({ success: true, eventId: "event-1" });
    expect(mockEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ location: "Parque das Nações" }),
      })
    );
  });

  it("returns error for an empty title", async () => {
    const result = await createEventAction({ ...VALID_INPUT, title: "   " });

    expect(result).toEqual({ error: "Title is required" });
    expect(mockEventCreate).not.toHaveBeenCalled();
  });

  it("returns error when title exceeds 80 characters", async () => {
    const result = await createEventAction({ ...VALID_INPUT, title: "a".repeat(81) });

    expect(result).toEqual({ error: "Title must be 80 characters or less" });
    expect(mockEventCreate).not.toHaveBeenCalled();
  });

  it("returns error for an invalid startsAt", async () => {
    const result = await createEventAction({ ...VALID_INPUT, startsAt: "not-a-date" });

    expect(result).toEqual({ error: "Invalid startsAt" });
    expect(mockEventCreate).not.toHaveBeenCalled();
  });

  it("rejects an event whose start is in the past", async () => {
    const result = await createEventAction({
      ...VALID_INPUT,
      startsAt: "2020-01-01T00:00:00.000Z",
      endsAt: "2020-01-01T01:00:00.000Z",
    });

    expect(result).toEqual({ error: "Event start must be in the future" });
    expect(mockEventCreate).not.toHaveBeenCalled();
  });

  it("returns error when endsAt is not after startsAt", async () => {
    const result = await createEventAction({
      ...VALID_INPUT,
      startsAt: "2026-09-01T18:00:00.000Z",
      endsAt: "2026-09-01T18:00:00.000Z",
    });

    expect(result).toEqual({ error: "endsAt must be after startsAt" });
    expect(mockEventCreate).not.toHaveBeenCalled();
  });

  it("returns error for an invalid endsAt", async () => {
    const result = await createEventAction({
      ...VALID_INPUT,
      endsAt: "not-a-date",
    });

    expect(result).toEqual({ error: "Invalid endsAt" });
    expect(mockEventCreate).not.toHaveBeenCalled();
  });

  it("returns error for an unknown event type", async () => {
    const result = await createEventAction({
      ...VALID_INPUT,
      type: "TEAM_BUILDING",
    } as never);

    expect(result).toEqual({ error: "Invalid event type" });
    expect(mockEventCreate).not.toHaveBeenCalled();
  });

  it("returns error for a negative price", async () => {
    const result = await createEventAction({ ...VALID_INPUT, price: -1 });

    expect(result).toEqual({ error: "Price must be between 0 and 1000000" });
    expect(mockEventCreate).not.toHaveBeenCalled();
  });

  it("returns error for an excessive price", async () => {
    const result = await createEventAction({ ...VALID_INPUT, price: 1000001 });

    expect(result).toEqual({ error: "Price must be between 0 and 1000000" });
    expect(mockEventCreate).not.toHaveBeenCalled();
  });

  it("returns error for out-of-range capacity", async () => {
    const result = await createEventAction({ ...VALID_INPUT, capacity: 1001 });

    expect(result).toEqual({ error: "Capacity must be between 1 and 1000" });
    expect(mockEventCreate).not.toHaveBeenCalled();
  });

  it("rejects an invalid discipline", async () => {
    const result = await createEventAction({
      ...VALID_INPUT,
      disciplines: ["BOGUS"] as never,
    });

    expect(result).toEqual({ error: "Invalid discipline" });
    expect(mockEventCreate).not.toHaveBeenCalled();
  });

  it("dedupes repeated disciplines", async () => {
    mockEventCreate.mockResolvedValue({ id: "event-1" });

    const result = await createEventAction({
      ...VALID_INPUT,
      disciplines: ["CROSSFIT", "CROSSFIT", "YOGA"],
    });

    expect(result).toEqual({ success: true, eventId: "event-1" });
    expect(mockEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ disciplines: ["CROSSFIT", "YOGA"] }),
      })
    );
  });

  it("rejects more than 10 disciplines", async () => {
    const result = await createEventAction({
      ...VALID_INPUT,
      disciplines: [
        "WEIGHTLIFTING",
        "CROSSFIT",
        "YOGA",
        "PILATES",
        "RUNNING",
        "CYCLING",
        "SWIMMING",
        "BOXING",
        "MARTIAL_ARTS",
        "CALISTHENICS",
        "HIIT",
      ],
    });

    expect(result).toEqual({ error: "Select up to 10 disciplines" });
    expect(mockEventCreate).not.toHaveBeenCalled();
  });

  it("normalizes missing disciplines to an empty list", async () => {
    mockEventCreate.mockResolvedValue({ id: "event-1" });

    await createEventAction(VALID_INPUT);

    expect(mockEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ disciplines: [] }),
      })
    );
  });

  it("stores the gym's city for gym events", async () => {
    mockGymFindUnique.mockResolvedValue({ city: "Lisbon" });
    mockEventCreate.mockResolvedValue({ id: "event-1" });

    const result = await createEventAction({
      ...VALID_INPUT,
      gymId: "gym-own",
      location: null,
    });

    expect(result).toEqual({ success: true, eventId: "event-1" });
    expect(mockGymFindUnique).toHaveBeenCalledWith({
      where: { id: "gym-own" },
      select: { city: true },
    });
    expect(mockEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ city: "Lisbon" }),
      })
    );
  });

  it("stores the creator's city for gymless events", async () => {
    mockEventCreate.mockResolvedValue({ id: "event-1" });

    const result = await createEventAction({
      ...VALID_INPUT,
      gymId: null,
      location: "Parque das Nações",
    });

    expect(result).toEqual({ success: true, eventId: "event-1" });
    expect(mockGymFindUnique).not.toHaveBeenCalled();
    expect(mockEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ city: "Buenos Aires" }),
      })
    );
  });

  it("omits the city when the gym has no city", async () => {
    mockGymFindUnique.mockResolvedValue({ city: null });
    mockEventCreate.mockResolvedValue({ id: "event-1" });

    await createEventAction({
      ...VALID_INPUT,
      gymId: "gym-own",
      location: null,
    });

    const createData = mockEventCreate.mock.calls[0]?.[0]?.data;
    expect(createData).not.toHaveProperty("city");
  });

  it("rejects an event at a gym that does not exist", async () => {
    mockGymFindUnique.mockResolvedValue(null);

    const result = await createEventAction({
      ...VALID_INPUT,
      gymId: "gym-own",
      location: null,
    });

    expect(result).toEqual({ error: "Gym not found" });
    expect(mockEventCreate).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// updateEventAction
// ─────────────────────────────────────────────────────────────────────────

describe("updateEventAction", () => {
  it("returns error when the event belongs to another user", async () => {
    mockEventFindUnique.mockResolvedValue({ creatorId: "db-other" });

    const result = await updateEventAction("event-1", VALID_INPUT);

    expect(result).toEqual({ error: "Not your event" });
    expect(mockEventUpdate).not.toHaveBeenCalled();
  });

  it("returns error when the event does not exist", async () => {
    mockEventFindUnique.mockResolvedValue(null);

    const result = await updateEventAction("event-ghost", VALID_INPUT);

    expect(result).toEqual({ error: "Event not found" });
    expect(mockEventUpdate).not.toHaveBeenCalled();
  });

  it("updates the event when the creator owns it", async () => {
    mockEventFindUnique.mockResolvedValue({ creatorId: "db-u1" });
    mockEventUpdate.mockResolvedValue({});

    const result = await updateEventAction("event-1", {
      ...VALID_INPUT,
      title: "Updated title",
    });

    expect(result).toEqual({ success: true });
    expect(mockEventUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "event-1" },
        data: expect.objectContaining({ title: "Updated title" }),
      })
    );
  });

  it("rejects moving a future event into the past", async () => {
    mockEventFindUnique.mockResolvedValue({
      creatorId: "db-u1",
      startsAt: new Date("2026-09-01T18:00:00.000Z"),
    });

    const result = await updateEventAction("event-1", {
      ...VALID_INPUT,
      startsAt: "2020-01-01T00:00:00.000Z",
      endsAt: "2020-01-01T01:00:00.000Z",
    });

    expect(result).toEqual({ error: "Event start must be in the future" });
    expect(mockEventUpdate).not.toHaveBeenCalled();
  });

  it("allows editing a past event while keeping its past start", async () => {
    mockEventFindUnique.mockResolvedValue({
      creatorId: "db-u1",
      startsAt: new Date("2020-01-02T00:00:00.000Z"),
    });
    mockEventUpdate.mockResolvedValue({});

    const result = await updateEventAction("event-1", {
      ...VALID_INPUT,
      startsAt: "2020-01-01T00:00:00.000Z",
      endsAt: "2020-01-01T01:00:00.000Z",
      title: "Fix description",
    });

    expect(result).toEqual({ success: true });
    expect(mockEventUpdate).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// deleteEventAction
// ─────────────────────────────────────────────────────────────────────────

describe("deleteEventAction", () => {
  it("returns error when the event belongs to another user", async () => {
    mockEventFindUnique.mockResolvedValue({ creatorId: "db-other" });

    const result = await deleteEventAction("event-1");

    expect(result).toEqual({ error: "Not your event" });
    expect(mockEventDelete).not.toHaveBeenCalled();
  });

  it("deletes the event when the creator owns it", async () => {
    mockEventFindUnique.mockResolvedValue({ creatorId: "db-u1" });
    mockEventDelete.mockResolvedValue({});

    const result = await deleteEventAction("event-1");

    expect(result).toEqual({ success: true });
    expect(mockEventDelete).toHaveBeenCalledWith({ where: { id: "event-1" } });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// toggleEventRsvpAction
// ─────────────────────────────────────────────────────────────────────────

describe("toggleEventRsvpAction", () => {
  it("returns error when the event does not exist", async () => {
    mockEventFindUnique.mockResolvedValue(null);

    const result = await toggleEventRsvpAction("event-ghost");

    expect(result).toEqual({ error: "Event not found" });
    expect(mockRsvpFindFirst).not.toHaveBeenCalled();
  });

  it("creates an rsvp when the user is not yet attending", async () => {
    mockEventFindUnique.mockResolvedValue({ id: "event-1" });
    mockRsvpFindFirst.mockResolvedValue(null);
    mockRsvpCreate.mockResolvedValue({});

    const result = await toggleEventRsvpAction("event-1");

    expect(result).toEqual({ success: true, attending: true });
    expect(mockRsvpCreate).toHaveBeenCalledWith({
      data: { eventId: "event-1", userId: "db-u1" },
    });
    expect(mockRsvpDelete).not.toHaveBeenCalled();
  });

  it("deletes the rsvp when the user is already attending", async () => {
    mockEventFindUnique.mockResolvedValue({ id: "event-1" });
    mockRsvpFindFirst.mockResolvedValue({ id: "rsvp-1" });
    mockRsvpDelete.mockResolvedValue({});

    const result = await toggleEventRsvpAction("event-1");

    expect(result).toEqual({ success: true, attending: false });
    expect(mockRsvpDelete).toHaveBeenCalledWith({ where: { id: "rsvp-1" } });
    expect(mockRsvpCreate).not.toHaveBeenCalled();
  });
});