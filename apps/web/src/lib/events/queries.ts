import { getUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/auth/admin";
import type { Discipline, EventType, Prisma } from "@prisma/client";
import type { EventWithRelations } from "./types";
import { isNearGym } from "./distance";

const LIST_INCLUDE = {
  creator: {
    select: {
      id: true,
      name: true,
      username: true,
      photos: {
        select: { id: true, url: true, position: true },
        orderBy: { position: "asc" as const },
        take: 1,
      },
    },
  },
  gym: { select: { id: true, name: true } },
  _count: { select: { rsvps: true } },
} as const;

/**
 * Returns upcoming events (startsAt >= now), soonest first.
 * Each event carries its creator's profile, gym and rsvp count.
 */
export async function getUpcomingEvents(
  limit = 20
): Promise<EventWithRelations[]> {
  const events = await prismaAdmin.event.findMany({
    where: { startsAt: { gte: new Date() } },
    include: LIST_INCLUDE,
    orderBy: { startsAt: "asc" },
    take: limit,
  });

  return events;
}

/**
 * Returns upcoming events for a single gym, soonest first.
 */
export async function getUpcomingEventsForGym(
  gymId: string,
  limit = 20
): Promise<EventWithRelations[]> {
  const events = await prismaAdmin.event.findMany({
    where: { startsAt: { gte: new Date() }, gymId },
    include: LIST_INCLUDE,
    orderBy: { startsAt: "asc" },
    take: limit,
  });

  return events;
}

/**
 * Returns events created by a single user, newest first.
 * Shows upcoming and past events together; the caller decides the
 * "upcoming" flag from each event's startsAt.
 */
export async function getMyEvents(
  userId: string,
  limit = 50
): Promise<EventWithRelations[]> {
  const events = await prismaAdmin.event.findMany({
    where: { creatorId: userId },
    include: LIST_INCLUDE,
    orderBy: { startsAt: "desc" },
    take: limit,
  });

  return events;
}

/**
 * Returns the DB user id of the currently authenticated user, or null
 * when unauthenticated / not yet synced.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const user = await getUser();
  if (!user) return null;

  const dbUser = await prismaAdmin.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true },
  });

  return dbUser?.id ?? null;
}

/**
 * Returns a single event with creator profile, gym and full rsvp list
 * (each rsvp includes the attending user's profile), or null.
 */
export async function getEventById(eventId: string) {
  return prismaAdmin.event.findUnique({
    where: { id: eventId },
    include: {
      ...LIST_INCLUDE,
      rsvps: {
        where: { user: { incognitoMode: false, bannedAt: null } },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              city: true,
              photos: {
                select: { id: true, url: true, position: true },
                orderBy: { position: "asc" as const },
                take: 1,
              },
              gym: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" as const },
      },
    },
  });
}

// ── Filtered feed ───────────────────────────────────────────────────────────

export type EventFeed = {
  events: EventWithRelations[];
  nextCursor: string | null;
};

export interface EventFilterInput {
  userId: string;
  nearMe?: boolean;
  disciplines?: Discipline[];
  types?: EventType[];
  limit?: number;
  cursor?: string;
}

/**
 * Slices a page of events (limit+1 fetched) into a feed + hasMore cursor.
 */
function sliceFeed(events: EventWithRelations[], limit: number): EventFeed {
  const hasMore = events.length > limit;
  const page = hasMore ? events.slice(0, limit) : events;
  const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null;
  return { events: page, nextCursor };
}

/**
 * Returns events filtered by the given criteria, upcoming first.
 *
 * - types: only events of these EventType values.
 * - disciplines: any event carrying at least one of these disciplines.
 * - nearMe: events whose denormalized city equals the viewer's city OR whose
 *   gym is within maxDistance km (default 25) of the viewer's gym. The city
 *   part is a Prisma where; the distance part is a post-filter over gym
 *   coordinates. Returns [] when the viewer has neither a city nor gym coords.
 *
 * Pagination: simple take(limit + 1) + slice, `nextCursor` is the last event id.
 */
export async function getFilteredEvents({
  userId,
  nearMe = false,
  disciplines = [],
  types = [],
  limit = 20,
  cursor,
}: EventFilterInput): Promise<EventFeed> {
  const baseWhere: Prisma.EventWhereInput = {
    startsAt: { gte: new Date() },
    ...(types.length > 0 && { type: { in: types } }),
    ...(disciplines.length > 0 && { disciplines: { hasSome: disciplines } }),
    ...(cursor && { id: { gt: cursor } }),
  };

  if (!nearMe) {
    const rows = await prismaAdmin.event.findMany({
      where: baseWhere,
      include: LIST_INCLUDE,
      orderBy: { startsAt: "asc" },
      take: limit + 1,
    });
    return sliceFeed(rows, limit);
  }

  const viewer = await prismaAdmin.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      city: true,
      maxDistance: true,
      gym: { select: { lat: true, lng: true } },
    },
  });
  if (!viewer) return { events: [], nextCursor: null };

  const hasGymCoords = viewer.gym?.lat != null && viewer.gym?.lng != null;
  if (viewer.city == null && !hasGymCoords) return { events: [], nextCursor: null };

  const cityEvents: EventWithRelations[] =
    viewer.city != null
      ? await prismaAdmin.event.findMany({
          where: { ...baseWhere, city: viewer.city },
          include: LIST_INCLUDE,
          orderBy: { startsAt: "asc" },
          take: limit + 1,
        })
      : [];

  let distanceEvents: EventWithRelations[] = [];
  if (hasGymCoords) {
    const rows = await prismaAdmin.event.findMany({
      where: baseWhere,
      include: {
        ...LIST_INCLUDE,
        gym: { select: { id: true, name: true, lat: true, lng: true } },
      },
      orderBy: { startsAt: "asc" },
      take: limit + 1,
    });
    distanceEvents = rows.filter((event) =>
      isNearGym(event, viewer.gym, viewer.maxDistance ?? 25)
    );
  }

  // Union city + distance results, dedupe by id, keep ascending startsAt order.
  const byId = new Map<string, EventWithRelations>();
  for (const event of [...cityEvents, ...distanceEvents]) {
    if (!byId.has(event.id)) byId.set(event.id, event);
  }
  const merged = Array.from(byId.values()).sort(
    (a, b) => a.startsAt.getTime() - b.startsAt.getTime()
  );

  return sliceFeed(merged, limit);
}

/**
 * Returns the current user's profile data used to render the event filter UI:
 * their disciplines (chips), city, gym coordinates and whether they have a gym.
 * Returns null when unauthenticated / not yet synced.
 */
export async function getCurrentUserProfileFilter(): Promise<{
  disciplines: Discipline[];
  city: string | null;
  gymLatLng: { lat: number; lng: number } | null;
  hasGym: boolean;
} | null> {
  const user = await getUser();
  if (!user) return null;

  const dbUser = await prismaAdmin.user.findUnique({
    where: { supabaseId: user.id },
    select: {
      disciplines: true,
      city: true,
      gym: { select: { id: true, lat: true, lng: true } },
    },
  });
  if (!dbUser) return null;

  const gymLatLng =
    dbUser.gym && dbUser.gym.lat != null && dbUser.gym.lng != null
      ? { lat: dbUser.gym.lat, lng: dbUser.gym.lng }
      : null;

  return {
    disciplines: dbUser.disciplines,
    city: dbUser.city,
    gymLatLng,
    hasGym: dbUser.gym != null,
  };
}