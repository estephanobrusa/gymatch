"use server";

import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/auth/admin";
import {
  getNotificationsForUser,
  getUnreadNotificationsCountForUser,
} from "./service";
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
  return getNotificationsForUser(currentUserId);
}

/**
 * Returns the current user's unread notification count (for the badge).
 */
export async function getUnreadNotificationsCountAction(): Promise<number> {
  const currentUserId = await resolveCurrentUserId();
  return getUnreadNotificationsCountForUser(currentUserId);
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
