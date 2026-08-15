"use server";

import { getUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/auth/admin";
import type { Discipline, EventType } from "@prisma/client";
import { DISCIPLINE_VALUES } from "@gymatch/core";
import type { EventInput } from "@gymatch/core";
import { toggleEventRsvp } from "./service";

// ── Constants ────────────────────────────────────────────────────────────────

const EVENT_TYPE_VALUES: EventType[] = [
  "CHALLENGE",
  "CLINIC",
  "COMPETITION",
  "FUNDRAISER",
  "MEETUP",
  "OPEN_MAT",
  "RETREAT",
  "SEMINAR",
  "SOCIAL",
  "TOURNAMENT",
  "WORKSHOP",
];

const MAX_TITLE_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_LOCATION_LENGTH = 140;
const MAX_CAPACITY = 1000;
const MAX_PRICE = 1000000;
const MAX_DISCIPLINES = 10;

// ── Helpers ─────────────────────────────────────────────────────────────────

type ParsedEventData = {
  title: string;
  type: EventType;
  startsAt: Date;
  endsAt?: Date;
  description?: string;
  location?: string;
  gymId?: string;
  capacity?: number;
  price: number;
  disciplines: Discipline[];
};

function toDate(value: string | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Validates and normalizes the disciplines selection.
 * Returns the parsed list (deduped, capped) or an error string.
 * Empty/undefined input normalizes to [].
 */
function parseDisciplines(
  input: Discipline[] | null | undefined
): { disciplines: Discipline[] } | { error: string } {
  if (input == null) return { disciplines: [] };

  for (const d of input) {
    if (!DISCIPLINE_VALUES.includes(d)) return { error: "Invalid discipline" };
  }

  const deduped = Array.from(new Set(input));
  if (deduped.length > MAX_DISCIPLINES) {
    return { error: `Select up to ${MAX_DISCIPLINES} disciplines` };
  }

  return { disciplines: deduped };
}

/**
 * Validates and normalizes an EventInput into a safe shape.
 * Returns the parsed data or an error string.
 */
function parseEventInput(input: EventInput): { data: ParsedEventData } | { error: string } {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) return { error: "Title is required" };
  if (title.length > MAX_TITLE_LENGTH) {
    return { error: `Title must be ${MAX_TITLE_LENGTH} characters or less` };
  }

  if (!EVENT_TYPE_VALUES.includes(input.type)) return { error: "Invalid event type" };

  const startsAt = toDate(input.startsAt);
  if (!startsAt) return { error: "Invalid startsAt" };

  let endsAt: Date | undefined;
  if (input.endsAt != null && input.endsAt !== "") {
    const parsedEnd = toDate(input.endsAt);
    if (!parsedEnd) return { error: "Invalid endsAt" };
    if (parsedEnd.getTime() <= startsAt.getTime()) {
      return { error: "endsAt must be after startsAt" };
    }
    endsAt = parsedEnd;
  }

  const description = typeof input.description === "string" ? input.description.trim() : null;
  if (description !== null && description.length > MAX_DESCRIPTION_LENGTH) {
    return { error: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less` };
  }

  const location = typeof input.location === "string" ? input.location.trim() : null;
  if (location !== null && location.length > MAX_LOCATION_LENGTH) {
    return { error: `Location must be ${MAX_LOCATION_LENGTH} characters or less` };
  }

  const gymId =
    typeof input.gymId === "string" && input.gymId.trim() !== "" ? input.gymId.trim() : null;

  if (gymId === null && location === null) {
    return { error: "Location is required for events without a gym" };
  }

  let capacity: number | undefined;
  if (input.capacity != null) {
    const parsedCapacity = input.capacity;
    if (!Number.isInteger(parsedCapacity) || parsedCapacity < 1 || parsedCapacity > MAX_CAPACITY) {
      return { error: `Capacity must be between 1 and ${MAX_CAPACITY}` };
    }
    capacity = parsedCapacity;
  }

  const price = input.price ?? 0;
  if (!Number.isInteger(price) || price < 0 || price > MAX_PRICE) {
    return { error: `Price must be between 0 and ${MAX_PRICE}` };
  }

  const parsedDisciplines = parseDisciplines(input.disciplines);
  if ("error" in parsedDisciplines) return { error: parsedDisciplines.error };

  return {
    data: {
      title,
      type: input.type,
      startsAt,
      price,
      disciplines: parsedDisciplines.disciplines,
      // exactOptionalPropertyTypes: omit null/undefined optional fields
      ...(endsAt !== undefined && { endsAt }),
      ...(description !== null && { description }),
      ...(location !== null && { location }),
      ...(gymId !== null && { gymId }),
      ...(capacity !== undefined && { capacity }),
    },
  };
}

/**
 * Returns the DB user (with gymId and city) for the currently authenticated
 * user, or null when unauthenticated / not yet synced.
 */
async function resolveDbUser(): Promise<{
  id: string;
  gymId: string | null;
  city: string | null;
} | null> {
  const user = await getUser();
  if (!user) return null;

  return prismaAdmin.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true, gymId: true, city: true },
  });
}

/**
 * Validates that an event's gym, when set, belongs to the creating user.
 */
function validateEventGym(data: ParsedEventData, dbUser: { gymId: string | null }): string | null {
  if (data.gymId === undefined || data.gymId === null) return null;
  if (dbUser.gymId === null || dbUser.gymId !== data.gymId) {
    return "The event must be at your own gym";
  }
  return null;
}

/**
 * Derives the denormalized `city` for an event (used by the "near me" filter).
 * Gym events take the gym's city; gymless events take the creator's city.
 * Returns null when either side has no city, so callers can omit the field.
 */
async function deriveEventCity(
  data: ParsedEventData,
  dbUser: { city: string | null }
): Promise<{ city: string | null; error: string | null }> {
  if (data.gymId === undefined || data.gymId === null) {
    return { city: dbUser.city, error: null };
  }

  const gym = await prismaAdmin.gym.findUnique({
    where: { id: data.gymId },
    select: { city: true },
  });
  if (!gym) return { city: null, error: "Gym not found" };

  return { city: gym.city, error: null };
}

// ── Actions ──────────────────────────────────────────────────────────────────

/**
 * Creates a new event owned by the authenticated user.
 * The event is attached to the creator's own gym OR has a free-form location.
 */
export async function createEventAction(
  input: EventInput
): Promise<{ success: true; eventId: string } | { error: string }> {
  const parsed = parseEventInput(input);
  if ("error" in parsed) return { error: parsed.error };

  if (parsed.data.startsAt.getTime() < Date.now()) {
    return { error: "Event start must be in the future" };
  }

  const dbUser = await resolveDbUser();
  if (!dbUser) return { error: "Unauthenticated" };

  const gymError = validateEventGym(parsed.data, dbUser);
  if (gymError) return { error: gymError };

  const cityResult = await deriveEventCity(parsed.data, dbUser);
  if (cityResult.error) return { error: cityResult.error };

  const event = await prismaAdmin.event.create({
    data: {
      ...parsed.data,
      creatorId: dbUser.id,
      ...(cityResult.city != null && { city: cityResult.city }),
    },
    select: { id: true },
  });

  return { success: true, eventId: event.id };
}

/**
 * Updates an existing event. Only the creator can update it.
 * Uses the same validation as creation.
 */
export async function updateEventAction(
  eventId: string,
  input: EventInput
): Promise<{ success: true } | { error: string }> {
  const parsed = parseEventInput(input);
  if ("error" in parsed) return { error: parsed.error };

  const dbUser = await resolveDbUser();
  if (!dbUser) return { error: "Unauthenticated" };

  const existing = await prismaAdmin.event.findUnique({
    where: { id: eventId },
    select: { creatorId: true, startsAt: true },
  });
  if (!existing) return { error: "Event not found" };

  if (existing.creatorId !== dbUser.id) return { error: "Not your event" };

  // A future event can't be moved into the past; editing a past event stays allowed.
  if (
    parsed.data.startsAt.getTime() < Date.now() &&
    existing.startsAt.getTime() >= Date.now()
  ) {
    return { error: "Event start must be in the future" };
  }

  const gymError = validateEventGym(parsed.data, dbUser);
  if (gymError) return { error: gymError };

  const cityResult = await deriveEventCity(parsed.data, dbUser);
  if (cityResult.error) return { error: cityResult.error };

  await prismaAdmin.event.update({
    where: { id: eventId },
    data: {
      ...parsed.data,
      ...(cityResult.city != null && { city: cityResult.city }),
    },
  });

  return { success: true };
}

/**
 * Deletes an existing event. Only the creator can delete it.
 */
export async function deleteEventAction(eventId: string): Promise<{ success: true } | { error: string }> {
  const dbUser = await resolveDbUser();
  if (!dbUser) return { error: "Unauthenticated" };

  const existing = await prismaAdmin.event.findUnique({
    where: { id: eventId },
    select: { creatorId: true },
  });
  if (!existing) return { error: "Event not found" };

  if (existing.creatorId !== dbUser.id) return { error: "Not your event" };

  await prismaAdmin.event.delete({ where: { id: eventId } });

  return { success: true };
}

/**
 * Toggles the authenticated user's RSVP on an event.
 * Returns whether the user is now attending.
 */
export async function toggleEventRsvpAction(
  eventId: string
): Promise<{ success: true; attending: boolean } | { error: string }> {
  const dbUser = await resolveDbUser();
  if (!dbUser) return { error: "Unauthenticated" };

  return toggleEventRsvp(eventId, dbUser.id);
}