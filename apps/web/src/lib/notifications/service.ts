import { prismaAdmin } from "@/lib/auth/admin";
import type { NotificationPreview } from "@gymatch/core";

/**
 * Returns a user's notifications, newest first.
 * Each notification includes the actor's name + first photo for display.
 *
 * Shared by the server action (getNotificationsAction) and the REST handler
 * (GET /api/v1/notifications).
 */
export async function getNotificationsForUser(
  userId: string
): Promise<NotificationPreview[]> {
  const notifications = await prismaAdmin.notification.findMany({
    where: { userId },
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          photos: {
            select: { url: true, position: true },
            orderBy: { position: "asc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return notifications.map((n) => ({
    id: n.id,
    type: n.type,
    actor: n.actor
      ? { id: n.actor.id, name: n.actor.name, photoUrl: n.actor.photos[0]?.url ?? null }
      : null,
    matchId: n.matchId,
    conversationId: n.conversationId,
    read: n.readAt !== null,
    createdAt: n.createdAt.toISOString(),
  }));
}

/**
 * Returns a user's unread notification count (for the badge).
 *
 * Shared by the server action (getUnreadNotificationsCountAction) and the
 * REST handler (GET /api/v1/notifications).
 */
export async function getUnreadNotificationsCountForUser(
  userId: string
): Promise<number> {
  return prismaAdmin.notification.count({
    where: { userId, readAt: null },
  });
}