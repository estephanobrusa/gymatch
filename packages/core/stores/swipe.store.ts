import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { current } from "immer";
import { isFeatureEnabled } from "../lib/swipe/feature-flags";
import type { DiscoveryCard, SwipeDirection, SwipeResult } from "../lib/swipe/types";

interface SwipeStore {
  // State
  stack: DiscoveryCard[];
  currentMatch: SwipeResult | null;
  isAnimating: boolean;
  /** Last card swiped off — used by rewind when the flag is enabled. */
  lastSwiped: DiscoveryCard | null;

  // Actions
  loadStack: (cards: DiscoveryCard[]) => void;
  appendCards: (cards: DiscoveryCard[]) => void;
  swipe: (
    direction: SwipeDirection, // forwarded to `action` by the caller; stored for future analytics
    action: () => Promise<SwipeResult>
  ) => Promise<void>;
  clearMatch: () => void;
  rewind: () => void;
}

export const useSwipeStore = create<SwipeStore>()(
  immer((set) => ({
    stack: [],
    currentMatch: null,
    isAnimating: false,
    lastSwiped: null,

    loadStack: (cards) =>
      set((s) => {
        s.stack = cards;
        s.currentMatch = null;
      }),

    appendCards: (cards) =>
      set((s) => {
        const ids = new Set(s.stack.map((c) => c.id));
        s.stack.push(...cards.filter((c) => !ids.has(c.id)));
      }),

    swipe: async (_direction, action) => {
      let removed: DiscoveryCard | undefined;

      set((s) => {
        if (s.isAnimating || s.stack.length === 0) return;
        s.isAnimating = true;
        // Use immer's `current()` to produce a plain deep copy before the recipe finishes.
        // immer proxies are revoked when the recipe ends — we must escape the proxy
        // boundary before the set() call returns.
        //
        // Gotcha: `draftCard` is still an immer Draft<DiscoveryCard> here, not a plain
        // object. If we stored it directly in `removed`/`lastSwiped` instead of calling
        // `current()`, the proxy would be revoked the instant this recipe function
        // returns — any later read (e.g. the catch-block rollback below, or `rewind()`
        // reading `lastSwiped` in a future tick) would throw
        // "Cannot perform 'get' on a proxy that has been revoked". Always call
        // `current()` on a draft before it needs to outlive its `set()` call.
        const draftCard = s.stack.shift();
        if (draftCard) {
          removed = current(draftCard);
          s.lastSwiped = removed;
        }
      });

      if (!removed) return;

      try {
        const result = await action();
        set((s) => {
          if (result.matched) s.currentMatch = result;
          s.isAnimating = false;
        });
      } catch {
        set((s) => {
          if (removed) s.stack.unshift(removed);
          s.isAnimating = false;
        });
      }
    },

    clearMatch: () =>
      set((s) => {
        s.currentMatch = null;
      }),

    rewind: () =>
      set((s) => {
        if (!isFeatureEnabled("REWIND")) return;
        if (!s.lastSwiped) return;
        s.stack.unshift(s.lastSwiped);
        s.lastSwiped = null;
      }),
  }))
);
