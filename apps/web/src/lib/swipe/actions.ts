"use server";

import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/auth/admin";
import { sendPushToUser } from "@/lib/push/actions";
import { isFeatureEnabled, FeatureFlagError } from "@gymatch/core";
import { getDiscoveryFeed } from "./queries";
import type { DiscoveryCard, SwipeDirection, SwipeResult } from "@gymatch/core";

/**
 * Records a swipe from the currently authenticated user to `toId`.
 *
 * Uses `$transaction` for atomicity:
 *   1. Upsert the Swipe row (unique on fromId+toId — prevents duplicates)
 *   2. If direction === LIKE: check for a reverse LIKE (mutual match)
 *   3. If mutual match: create Match (userAId = min, userBId = max) + Conversation
 *
 * Feature-flag guard: SUPER_LIKE is not a valid SwipeDirection for MVP.
 * Passing "SUPER_LIKE" throws FeatureFlagError when the flag is off.
 */
export async function recordSwipe(
  toId: string,
  direction: SwipeDirection
): Promise<SwipeResult> {
  // ── Feature flag guard ─────────────────────────────────────────────────
  // Cast to string to handle callers that pass an extended direction type
  if ((direction as string) === "SUPER_LIKE" && !isFeatureEnabled("SUPER_LIKE")) {
    throw new FeatureFlagError("Super Like not available");
  }

  // ── Resolve the calling user's DB id ───────────────────────────────────
  const authUser = await getUser();
  if (!authUser) redirect("/login");

  const dbUser = await prismaAdmin.user.findUnique({
    where: { supabaseId: authUser.id },
    select: { id: true },
  });

  if (!dbUser) redirect("/login");

  const fromId = dbUser.id;

  // ── Atomic swipe + match detection ─────────────────────────────────────
  const result = await prismaAdmin.$transaction(async (tx) => {
    // 1. Upsert the swipe row
    await tx.swipe.upsert({
      where: { fromId_toId: { fromId, toId } },
      update: { direction },
      create: { fromId, toId, direction },
    });

    // 2. Only check for mutual match on a LIKE
    if (direction !== "LIKE") {
      return { matched: false } satisfies SwipeResult;
    }

    // 3. Check for reverse LIKE
    const reverseSwipe = await tx.swipe.findFirst({
      where: { fromId: toId, toId: fromId, direction: "LIKE" },
    });

    if (!reverseSwipe) {
      return { matched: false } satisfies SwipeResult;
    }

    // 4. Mutual match — enforce ordering invariant: userAId = lexicographic min
    const userAId = fromId < toId ? fromId : toId;
    const userBId = fromId < toId ? toId : fromId;

    const match = await tx.match.create({
      data: { userAId, userBId },
    });

    await tx.conversation.create({
      data: { matchId: match.id },
    });

    // 5. Notify the OTHER user about the new match (the swiper sees the modal)
    await tx.notification.create({
      data: {
        userId: toId,
        type: "NEW_MATCH",
        actorId: fromId,
        matchId: match.id,
      },
    });

    // 6. Fetch matched user's display data for the UI
    const matchedUser = await tx.user.findUnique({
      where: { id: toId },
      select: { id: true, name: true, photos: { select: { url: true, position: true }, orderBy: { position: "asc" }, take: 1 } },
    });

    return {
      matched: true,
      matchId: match.id,
      matchedUser: matchedUser
        ? { id: matchedUser.id, name: matchedUser.name, photos: matchedUser.photos }
        : undefined,
    } satisfies SwipeResult;
  });

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
