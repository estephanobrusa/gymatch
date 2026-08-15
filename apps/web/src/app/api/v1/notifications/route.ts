import { NextRequest, NextResponse } from "next/server";
import { handleApiRequest } from "@/lib/api/http";
import {
  getNotificationsForUser,
  getUnreadNotificationsCountForUser,
} from "@/lib/notifications/service";

export const runtime = "nodejs";

/**
 * GET /api/v1/notifications
 *
 * Returns the current user's notifications (newest first) plus the unread
 * count for the badge.
 *
 * Success: 200 { items: NotificationPreview[], unreadCount: number }
 */
export async function GET(request: NextRequest) {
  return handleApiRequest(request, async (ctx) => {
    const [items, unreadCount] = await Promise.all([
      getNotificationsForUser(ctx.dbUser.id),
      getUnreadNotificationsCountForUser(ctx.dbUser.id),
    ]);
    return NextResponse.json({ items, unreadCount });
  });
}