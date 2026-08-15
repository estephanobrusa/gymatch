"use server";

import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/auth/admin";
import { sendPushToUser } from "@/lib/push/actions";
import { getDiscoveryFeed } from "./queries";
import { recordSwipeForUser } from "./service";
import type { DiscoveryCard, SwipeDirection, SwipeResult } from "@gymatch/core";

/**
 * Records a swipe from the currently authenticated user to `toId`.
 *
 * Auth + delegation boundary: resolves the DB user id and delegates the
 * business logic (swipe upsert, mutual-match detection, Match+Conversation
 * creation, notification) to `recordSwipeForUser`. Web push is fired here —
 * it only makes sense for the browser action layer.
 */
export async function recordSwipe(
  toId: string,
  direction: SwipeDirection
): Promise<SwipeResult> {
  // ── Resolve the calling user's DB id ───────────────────────────────────
  const authUser = await getUser();
  if (!authUser) redirect("/login");

  const dbUser = await prismaAdmin.user.findUnique({
    where: { supabaseId: authUser.id },
    select: { id: true },
  });

  if (!dbUser) redirect("/login");

  const fromId = dbUser.id;
  const result = await recordSwipeForUser(fromId, toId, direction);

  // Fire-and-forget push to the OTHER user when a match is made
  if (result.matched) {
    const actor = await prismaAdmin.user.findUnique({
      where: { id: fromId },
      select: { name: true },
    });
    sendPushToUser(toId, {
      title: "New match!",
      body: `You matched with ${actor?.name ?? "someone"}. Say hi!`,
      url: "/matches",
    }).catch(() => {});
  }

  return result;
}

/**
 * Server action gateway for the discovery feed infinite query.
 *
 * Resolves the authenticated user's DB id and delegates to `getDiscoveryFeed`.
 * No business logic lives here — this is a pure auth + delegation boundary.
 *
 * Throws if unauthenticated (redirect) or if the underlying query throws.
 */
export async function getDiscoveryFeedAction(
  cursor?: string
): Promise<{ cards: DiscoveryCard[]; nextCursor: string | null }> {
  const authUser = await getUser();
  if (!authUser) redirect("/login");

  const dbUser = await prismaAdmin.user.findUnique({
    where: { supabaseId: authUser.id },
    select: { id: true },
  });

  if (!dbUser) redirect("/login");

  return getDiscoveryFeed(dbUser.id, cursor);
}
