/**
 * @gymatch/core — single source of truth for shared domain types, pure
 * utilities and Zustand stores, consumed by apps/web (Next.js) and
 * apps/mobile (Expo React Native).
 *
 * Platform-safe: no React/Next/server-only imports. Prisma payload types are
 * imported with `import type` only and erased at build time, so this package
 * stays compatible with React Native bundlers.
 */

// Swipe
export type { SwipeDirection, DiscoveryCard, SwipeResult } from "./lib/swipe/types";
export { FeatureFlagError } from "./lib/swipe/errors";
export type { FeatureFlag } from "./lib/swipe/feature-flags";
export { isFeatureEnabled } from "./lib/swipe/feature-flags";
export { computeAge, passesAgeFilter } from "./lib/swipe/age-filter";

// Chat
export type { MatchPreview, ChatMessage, ConversationPage } from "./lib/chat/types";

// Events
export type {
  EventInput,
  EventWithRelations,
  EventRsvpWithUser,
  EventFeed,
  EventFilterInput,
} from "./lib/events/types";
export { haversineKm, isNearGym } from "./lib/events/distance";
export { EVENT_TYPE_LABELS } from "./lib/events/labels";
export { formatEventDate } from "./lib/events/format";

// Profile
export type { ScheduleSlotInput, ScheduleSlotWithGym, ProfileUser } from "./lib/profile/types";
export type { ScheduleContext } from "./lib/profile/compatibility";
export { isScheduleCompatible } from "./lib/profile/compatibility";

// Gym
export type { GymSearchResult } from "./lib/gym/types";

// Notifications
export type { NotificationPreview } from "./lib/notifications/types";

// Routine
export { DAY_KEYS } from "./lib/routine/templates";
export type { DayKey, TemplateName, RoutineTemplateMap } from "./lib/routine/templates";
export { TEMPLATES, getTodayMuscleGroup } from "./lib/routine/utils";
export type { WeeklyRoutineShape } from "./lib/routine/utils";
export type { RoutineInput } from "./lib/routine/types";

// Auth
export type { FitnessProfileInput, ActionResult } from "./lib/auth/types";

// Disciplines
export { DISCIPLINE_VALUES, DISCIPLINE_LABELS } from "./lib/disciplines";

// Stores
export { useSwipeStore } from "./stores";