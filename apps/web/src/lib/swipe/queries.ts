import { prismaAdmin } from "@/lib/auth/admin";
import { computeAge, passesAgeFilter } from "./age-filter";
import { isScheduleCompatible, type ScheduleContext } from "@/lib/profile/compatibility";
import type { DiscoveryCard } from "./types";

/**
 * Fetches a cursor-paginated discovery feed for the given user.
 *
 * Exclusion rules:
 *   1. Self
 *   2. Users already swiped by the requester (any direction)
 *   3. Users in any Block relationship with the requester (either direction)
 *   4. Users outside the bidirectional age range (viewer ↔ candidate)
 *   5. Users with hideProfile = true (paused discovery)
 *   6. Users with bannedAt set (banned from the app)
 *
 * Ordering: simple keyset cursor on `id` (no goals-overlap sorting for MVP).
 *
 * Returns `nextCursor: null` when there are no further results.
 */
export async function getDiscoveryFeed(
  userId: string,
  cursor?: string,
  limit = 10
): Promise<{ cards: DiscoveryCard[]; nextCursor: string | null }> {
  // ── 1. Fetch viewer's own data (for age filter) ──────────────────────────
  const [viewer, swipesMade, blocks] = await Promise.all([
    prismaAdmin.user.findUnique({
      where: { id: userId },
      select: {
        birthDate: true,
        minAge: true,
        maxAge: true,
        gymId: true,
        city: true,
        scheduleSlots: { select: { day: true, startTime: true, endTime: true } },
      },
    }),
    prismaAdmin.swipe.findMany({
      where: { fromId: userId },
      select: { toId: true },
    }),
    prismaAdmin.block.findMany({
      where: { OR: [{ fromId: userId }, { toId: userId }] },
      select: { fromId: true, toId: true },
    }),
  ]);

  const viewerAge = computeAge(viewer?.birthDate ?? null);
  const viewerMin = viewer?.minAge ?? 18;
  const viewerMax = viewer?.maxAge ?? 50;

  // ── 2. Collect excluded IDs ───────────────────────────────────────────────
  const excludedIds = new Set<string>([userId]);

  for (const swipe of swipesMade) {
    excludedIds.add(swipe.toId);
  }

  for (const block of blocks) {
    excludedIds.add(block.fromId);
    excludedIds.add(block.toId);
  }

  // ── 3. Fetch limit+1 rows to determine hasMore ────────────────────────────
  // Keyset cursor: id > lastSeenId for stable, index-friendly pagination.
  const rows = await prismaAdmin.user.findMany({
    where: {
      id: {
        notIn: Array.from(excludedIds),
        ...(cursor ? { gt: cursor } : {}),
      },
      hideProfile: false,
      bannedAt: null,
    },
    orderBy: { id: "asc" },
    take: limit + 1,
    select: {
      id: true,
      name: true,
      city: true,
      birthDate: true,
      minAge: true,
      maxAge: true,
      gymId: true,
      gym: { select: { name: true } },
      fitnessGoals: true,
      disciplines: true,
      experienceLevel: true,
      scheduleSlots: { select: { day: true, startTime: true, endTime: true } },
      photos: {
        select: { url: true, position: true },
        orderBy: { position: "asc" },
      },
    },
  });

  const hasMore = rows.length > limit;
  const slice = hasMore ? rows.slice(0, limit) : rows;

  // ── 4. Apply bidirectional age filter ─────────────────────────────────────
  const ageFiltered = slice.filter((row) => {
    const candidateAge = computeAge(row.birthDate);
    return passesAgeFilter(
      viewerAge,
      candidateAge,
      viewerMin,
      viewerMax,
      row.minAge,
      row.maxAge
    );
  });

  const viewerContext: ScheduleContext = {
    gymId: viewer?.gymId ?? null,
    city: viewer?.city ?? null,
    scheduleSlots: viewer?.scheduleSlots ?? [],
  };

  const cards: DiscoveryCard[] = ageFiltered.map((row) => {
    const rowContext: ScheduleContext = {
      gymId: row.gymId,
      city: row.city,
      scheduleSlots: row.scheduleSlots ?? [],
    };

    return {
      id: row.id,
      name: row.name,
      city: row.city,
      gymName: row.gym?.name ?? null,
      fitnessGoals: row.fitnessGoals as string[],
      disciplines: row.disciplines as string[],
      experienceLevel: row.experienceLevel as string | null,
      photos: row.photos,
      scheduleCompatible: isScheduleCompatible(viewerContext, rowContext),
    };
  });

  const nextCursor = hasMore ? (slice[slice.length - 1]?.id ?? null) : null;

  return { cards, nextCursor };
}
