import { prismaAdmin } from "@/lib/auth/admin";

export type EventRsvpResult = { success: true; attending: boolean } | { error: string };

/**
 * Toggles a user's RSVP on an event.
 * Returns whether the user is now attending.
 *
 * Shared by the server action (toggleEventRsvpAction) and the REST handler
 * (POST /api/v1/events/[eventId]/rsvp).
 */
export async function toggleEventRsvp(
  eventId: string,
  userId: string
): Promise<EventRsvpResult> {
  const event = await prismaAdmin.event.findUnique({
    where: { id: eventId },
    select: { id: true },
  });
  if (!event) return { error: "Event not found" };

  const existing = await prismaAdmin.eventRsvp.findFirst({
    where: { eventId, userId },
    select: { id: true },
  });

  if (existing) {
    await prismaAdmin.eventRsvp.delete({ where: { id: existing.id } });
    return { success: true, attending: false };
  }

  await prismaAdmin.eventRsvp.create({
    data: { eventId, userId },
  });

  return { success: true, attending: true };
}