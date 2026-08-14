"use server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { prismaAdmin } from "@/lib/auth/admin";
import { sendPushToUser } from "@/lib/push/actions";

export async function broadcastPushAction(data: {
  title: string;
  body: string;
  url?: string;
}): Promise<{ success: true; sent: number } | { error: string }> {
  await requireAdmin();

  if (!data.title.trim()) return { error: "Title is required" };
  if (!data.body.trim()) return { error: "Body is required" };

  // Get all unique userIds that have at least one push subscription
  const rows = await prismaAdmin.pushSubscription.findMany({
    select: { userId: true },
    distinct: ["userId"],
  });

  await Promise.allSettled(
    rows.map((r) =>
      sendPushToUser(r.userId, {
        title: data.title.trim(),
        body: data.body.trim(),
        url: data.url?.trim() || "/",
      })
    )
  );

  return { success: true, sent: rows.length };
}
