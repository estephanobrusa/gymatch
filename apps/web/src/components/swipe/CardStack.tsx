"use client";

import { useEffect } from "react";
import { useSwipeStore } from "@gymatch/core";
import { useDiscoveryFeed, useSwipeAction } from "@/lib/swipe/hooks";
import type { SwipeDirection } from "@gymatch/core";
import { SwipeCard } from "./SwipeCard";

const MAX_VISIBLE_CARDS = 3;
const PREFETCH_THRESHOLD = 2; // fetch next page when stack drops to this many cards

export function CardStack() {
  const stack = useSwipeStore((s) => s.stack);
  const swipe = useSwipeStore((s) => s.swipe);
  const { mutateAsync } = useSwipeAction();
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = useDiscoveryFeed();

  // Auto-load next page when stack is running low
  useEffect(() => {
    if (stack.length <= PREFETCH_THRESHOLD && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [stack.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (stack.length === 0) {
    return (
      <div
        data-testid="card-stack-empty"
        className="flex items-center justify-center w-full h-full text-muted-foreground"
      >
        {isFetchingNextPage ? (
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        ) : (
          <p>No more profiles — check back later!</p>
        )}
      </div>
    );
  }

  const visible = stack.slice(0, MAX_VISIBLE_CARDS);
  const topCard = stack[0];

  function handleSwipe(direction: SwipeDirection) {
    if (!topCard) return;
    void swipe(direction, () => mutateAsync({ toId: topCard.id, direction }));
  }

  return (
    <div className="relative w-full h-full">
      {visible.map((card, index) => (
        <SwipeCard
          key={card.id}
          card={card}
          isTop={index === 0}
          zIndex={MAX_VISIBLE_CARDS - index}
          onSwipe={handleSwipe}
          {...(index > 0 ? { "aria-hidden": true as const } : {})}
        />
      ))}
    </div>
  );
}
