import { differenceInYears } from "date-fns";

/**
 * Computes the full years elapsed since birthDate.
 * Returns null when birthDate is null (user hasn't provided it).
 */
export function computeAge(birthDate: Date | null): number | null {
  if (birthDate === null) return null;
  return differenceInYears(new Date(), birthDate);
}

/**
 * Bidirectional age range filter.
 *
 * Returns true (passes filter) when:
 * - Either age is null — permissive: we cannot filter someone without a birthDate
 * - The candidate's age is within [viewerMin, viewerMax]
 *   AND the viewer's age is within [candidateMin, candidateMax]
 *
 * Returns false only when both ages are known AND at least one direction is out of range.
 */
export function passesAgeFilter(
  viewerAge: number | null,
  candidateAge: number | null,
  viewerMin: number,
  viewerMax: number,
  candidateMin: number,
  candidateMax: number
): boolean {
  // Permissive: if either age is unknown, let them through
  if (viewerAge === null || candidateAge === null) return true;

  const candidateInViewerRange =
    candidateAge >= viewerMin && candidateAge <= viewerMax;

  const viewerInCandidateRange =
    viewerAge >= candidateMin && viewerAge <= candidateMax;

  return candidateInViewerRange && viewerInCandidateRange;
}
