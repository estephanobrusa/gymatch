import { prismaAdmin } from "@/lib/auth/admin";
import { isScheduleCompatible, type ScheduleContext } from "@gymatch/core";

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