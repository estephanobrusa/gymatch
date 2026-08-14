import type { Discipline, EventType } from "@prisma/client";
import type { Prisma } from "@prisma/client";

/**
 * Input shape for creating/updating an event, as submitted by the client.
 * Optional fields accept null to mean "not set" (no endsAt / no location / no gym).
 */
export type EventInput = {
  title: string;
  type: EventType;
  startsAt: string | Date;
  endsAt?: string | Date | null;
  description?: string | null;
  location?: string | null;
  gymId?: string | null;
  capacity?: number | null;
  price?: number | null;
  disciplines?: Discipline[] | null;
};

/**
 * A stored Event with its creator's profile, optional gym and rsvp count,
 * for display in event lists and details.
 */
export type EventWithRelations = Prisma.EventGetPayload<{
  include: {
    creator: {
      select: {
        id: true;
        name: true;
        username: true;
        photos: {
          select: { id: true; url: true; position: true };
          orderBy: { position: "asc" };
          take: 1;
        };
      };
    };
    gym: { select: { id: true; name: true } };
    _count: { select: { rsvps: true } };
  };
}>;

/**
 * A single RSVP with the attending user's profile, for the attendee list.
 */
export type EventRsvpWithUser = Prisma.EventRsvpGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        name: true;
        username: true;
        city: true;
        photos: {
          select: { id: true; url: true; position: true };
          orderBy: { position: "asc" };
          take: 1;
        };
        gym: { select: { id: true; name: true } };
      };
    };
  };
}>;