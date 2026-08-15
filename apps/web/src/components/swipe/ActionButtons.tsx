"use client";

import { X, Heart, Star } from "lucide-react";
import { useSwipeStore, isFeatureEnabled } from "@gymatch/core";
import { useSwipeAction } from "@/lib/swipe/hooks";
import type { SwipeDirection } from "@gymatch/core";

export function ActionButtons() {
  const isAnimating = useSwipeStore((s) => s.isAnimating);
  const swipe = useSwipeStore((s) => s.swipe);
  const topCard = useSwipeStore((s) => s.stack[0] ?? null);
  const { mutateAsync } = useSwipeAction();

  const showSuperLike = isFeatureEnabled("SUPER_LIKE");

  function handleSwipe(direction: SwipeDirection) {
    if (!topCard) return;
    void swipe(direction, () => mutateAsync({ toId: topCard.id, direction }));
  }

  return (
    <div className="flex gap-4 justify-center pb-6">
      <button
        type="button"
        aria-label="Nope"
        disabled={isAnimating}
        onClick={() => handleSwipe("PASS")}
        className="w-16 h-16 rounded-full border-2 bg-white shadow-lg flex items-center justify-center text-rose-500 border-rose-200 disabled:opacity-50"
      >
        <X size={24} aria-hidden="true" />
      </button>

      {showSuperLike && (
        <button
          type="button"
          aria-label="Super Like"
          disabled={isAnimating}
          onClick={() => handleSwipe("LIKE")}
          className="w-16 h-16 rounded-full border-2 bg-white shadow-lg flex items-center justify-center text-blue-400 border-blue-200 disabled:opacity-50"
        >
          <Star size={24} aria-hidden="true" />
        </button>
      )}

      <button
        type="button"
        aria-label="Like"
        disabled={isAnimating}
        onClick={() => handleSwipe("LIKE")}
        className="w-16 h-16 rounded-full border-2 bg-white shadow-lg flex items-center justify-center text-rose-500 border-rose-200 disabled:opacity-50"
      >
        <Heart size={24} aria-hidden="true" />
      </button>
    </div>
  );
}
