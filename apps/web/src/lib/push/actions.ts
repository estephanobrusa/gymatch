"use server";

import { getUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/auth/admin";
import webpush from "web-push";

/** Configure web-push lazily — env vars are only required when sending, not at import. */
function getWebPush(): typeof webpush {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  return webpush;
}

/** Subscribe the current user to push notifications. */
export async function subscribePushAction(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): Promise<{ success: true } | { error: string }> {
  const user = await getUser();
  if (!user) return { error: "Unauthenticated" };

  const dbUser = await prismaAdmin.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true },
  });
  if (!dbUser) return { error: "User not found" };

  await prismaAdmin.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    create: {
      userId: dbUser.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    update: {
      userId: dbUser.id,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  });

  return { success: true };
}

/** Unsubscribe the current device from push notifications. */
export async function unsubscribePushAction(
  endpoint: string
): Promise<{ success: true } | { error: string }> {
  const user = await getUser();
  if (!user) return { error: "Unauthenticated" };

  await prismaAdmin.pushSubscription.deleteMany({ where: { endpoint } });
  return { success: true };
}

/** Send a push notification to all subscriptions of a user (internal helper). */
export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string }
): Promise<void> {
  const subscriptions = await prismaAdmin.pushSubscription.findMany({
    where: { userId },
    select: { endpoint: true, p256dh: true, auth: true },
  });

  const json = JSON.stringify(payload);

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await getWebPush().sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          json
        );
      } catch (err: unknown) {
        // 410 Gone = subscription expired/unsubscribed — clean it up
        if (
          err &&
          typeof err === "object" &&
          "statusCode" in err &&
          (err as { statusCode: number }).statusCode === 410
        ) {
          await prismaAdmin.pushSubscription.deleteMany({
            where: { endpoint: sub.endpoint },
          });
        }
      }
    })
  );
}
