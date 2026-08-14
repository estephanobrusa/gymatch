import { prismaAdmin } from "@/lib/auth/admin";

function parseMinutes(time: string): number {
  const parts = time.split(":");
  return Number(parts[0]) * 60 + Number(parts[1]);
}

/**
 * Effective end minute of a slot. A missing endTime counts as
 * start + 60 minutes, capped at the end of the day.
 */
function slotEndMinutes(slot: { startTime: string; endTime: string | null }): number {
  if (slot.endTime) return parseMinutes(slot.endTime);
  return Math.min(parseMinutes(slot.startTime) + 60, 24 * 60);
}

export type ScheduleContext = {
  gymId: string | null;
  city: string | null;
  scheduleSlots:
    | { day: string; startTime: string; endTime: string | null }[]
    | null
    | undefined;
};

/**
 * Returns true when the candidate trains at the same gym OR lives in the
 * same city as the viewer AND shares at least one overlapping weekly slot.
 * A missing/empty schedule on either side means no overlap.
 */
export function isScheduleCompatible(
  viewer: ScheduleContext,
  candidate: ScheduleContext
): boolean {
  const sameGym = viewer.gymId !== null && viewer.gymId === candidate.gymId;
  const sameCity = viewer.city !== null && viewer.city === candidate.city;
  if (!sameGym && !sameCity) return false;

  const viewerSlots = viewer.scheduleSlots ?? [];
  const candidateSlots = candidate.scheduleSlots ?? [];

  return candidateSlots.some((slotB) =>
    viewerSlots.some((slotA) => {
      if (slotA.day !== slotB.day) return false;
      const aStart = parseMinutes(slotA.startTime);
      const aEnd = slotEndMinutes(slotA);
      const bStart = parseMinutes(slotB.startTime);
      const bEnd = slotEndMinutes(slotB);
      return aStart < bEnd && bStart < aEnd;
    })
  );
}

/**
 * Counts distinct candidate users who train at the same gym OR live in the
 * same city as the viewer AND share at least one overlapping weekly slot.
 * A candidate counts at most once regardless of how many slots match.
 */
export async function countCompatibleTrainers(userId: string): Promise<number> {
  const viewer = await prismaAdmin.user.findUnique({
    where: { id: userId },
    select: { id: true, city: true, gymId: true, scheduleSlots: true },
  });
  if (!viewer) return 0;

  const candidates = await prismaAdmin.user.findMany({
    where: { id: { not: userId }, scheduleSlots: { some: {} } },
    select: { id: true, city: true, gymId: true, scheduleSlots: true },
  });

  const viewerContext: ScheduleContext = {
    gymId: viewer.gymId,
    city: viewer.city,
    scheduleSlots: viewer.scheduleSlots,
  };

  let count = 0;

  for (const candidate of candidates) {
    if (
      isScheduleCompatible(viewerContext, {
        gymId: candidate.gymId,
        city: candidate.city,
        scheduleSlots: candidate.scheduleSlots,
      })
    ) {
      count += 1;
    }
  }

  return count;
}
