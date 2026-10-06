import { prismaAdmin } from "@/lib/auth/admin";
import {
  isFeatureEnabled,
  FeatureFlagError,
  type SwipeDirection,
  type SwipeResult,
} from "@gymatch/core";

/**
 * Records a swipe from `fromId` to `toId` and detects a mutual match.
 *
 * Uses `$transaction` for atomicity:
 *   1. Upsert the Swipe row (unique on fromId+toId — prevents duplicates)
 *   2. If direction === LIKE: check for a reverse LIKE (mutual match)
 *   3. If mutual match: create Match (userAId = min) + Conversation +
 *      NEW_MATCH notification for the OTHER user
 *
 * Shared by the server action (recordSwipe) and the REST handler
 * (POST /api/v1/swipe). Web push is intentionally NOT part of this function —
 * it is only fired from the browser action layer.
 */
export async function recordSwipeForUser(
  fromId: string,
  toId: string,
  direction: SwipeDirection
): Promise<SwipeResult> {
  // ── Feature flag guard ─────────────────────────────────────────────────
  // Cast to string to handle callers that pass an extended direction type
  if ((direction as string) === "SUPER_LIKE" && !isFeatureEnabled("SUPER_LIKE")) {
    throw new FeatureFlagError("Super Like not available");
  }

  return prismaAdmin.$transaction(async (tx) => {
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
    //    (e.g. ids "11..." and "99..." always store userAId = "11...", no
    //    matter who swiped last). This guarantees both swipe orders produce
    //    the same (userAId, userBId) tuple, which is what makes
    //    @@unique([userAId, userBId]) actually prevent duplicate matches —
    //    without it, (A, B) and (B, A) would look like two different rows.
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
      select: {
        id: true,
        name: true,
        photos: {
          select: { url: true, position: true },
          orderBy: { position: "asc" },
          take: 1,
        },
      },
    });

    return {
      matched: true,
      matchId: match.id,
      matchedUser: matchedUser
        ? { id: matchedUser.id, name: matchedUser.name, photos: matchedUser.photos }
        : undefined,
    } satisfies SwipeResult;
  });
}