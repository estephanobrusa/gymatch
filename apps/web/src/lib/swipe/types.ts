/**
 * Core swipe system types.
 *
 * NOTE: SwipeDirection mirrors the Prisma enum — must stay in sync.
 * SUPER_LIKE is intentionally excluded from the union; it is feature-flagged
 * and rejected at the action layer if the flag is off.
 */

export type SwipeDirection = "LIKE" | "PASS";

export interface DiscoveryCard {
  id: string;
  name: string;
  city: string | null;
  gymName: string | null;
  fitnessGoals: string[];
  disciplines: string[];
  experienceLevel: string | null;
  photos: { url: string; position: number }[];
  scheduleCompatible?: boolean;
}

export interface SwipeResult {
  matched: boolean;
  matchId?: string | undefined;
  matchedUser?: Pick<DiscoveryCard, "id" | "name" | "photos"> | undefined;
}
