"use server";

import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/auth/admin";
import type { NotificationPreview } from "@gymatch/core";

/**
 * Returns the DB user id for the currently authenticated user.
 * Redirects to /login if unauthenticated or missing from DB.
 */
async function resolveCurrentUserId(): Promise<string> {
  const authUser = await getUser();
  if (!authUser) redirect("/login");

  const dbUser = await prismaAdmin.user.findUnique({
    where: { supabaseId: authUser.id },
    select: { id: true },
  });

  if (!dbUser) redirect("/login");
  return dbUser.id;
}

/**
 * Returns the current user's notifications, newest first.
 * Each notification includes the actor's name + first photo for display.
 */
export async function getNotificationsAction(): Promise<NotificationPreview[]> {
  const currentUserId = await resolveCurrentUserId();

  const notifications = await prismaAdmin.notification.findMany({
    where: { userId: currentUserId },
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          photos: { select: { url: true, position: true }, orderBy: { position: "asc" }, take: 1 },
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
 * Returns the current user's unread notification count (for the badge).
 */
export async function getUnreadNotificationsCountAction(): Promise<number> {
  const currentUserId = await resolveCurrentUserId();

  return prismaAdmin.notification.count({
    where: { userId: currentUserId, readAt: null },
  });
}

/**
 * Marks all unread notifications as read for the current user.
 * Called when the user opens the notifications screen.
 */
export async function markNotificationsReadAction(): Promise<void> {
  const currentUserId = await resolveCurrentUserId();

  await prismaAdmin.notification.updateMany({
    where: { userId: currentUserId, readAt: null },
    data: { readAt: new Date() },
  });
}
