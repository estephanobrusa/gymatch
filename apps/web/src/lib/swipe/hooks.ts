import { useEffect } from "react";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { useSwipeStore } from "@gymatch/core";
import { getDiscoveryFeedAction, recordSwipe } from "./actions";
import type { SwipeDirection, SwipeResult } from "@gymatch/core";

// ── useDiscoveryFeed ──────────────────────────────────────────────────────

/**
 * Infinite query hook for the discovery feed.
 *
 * Syncs each newly fetched page into the Zustand store via useEffect on
 * data.pages. Avoids the deprecated onSuccess callback (removed in TQ5).
 *
 * Returns only the subset of query state that consumers need; internal TQ5
 * state management is an implementation detail.
 */
export function useDiscoveryFeed() {
  const appendCards = useSwipeStore((s) => s.appendCards);

  const query = useInfiniteQuery({
    queryKey: ["discovery-feed"],
    queryFn: ({ pageParam }) =>
      getDiscoveryFeedAction(pageParam ?? undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  // Sync the last fetched page to the store.
  // Only the last page is synced — appendCards is idempotent (deduplicates by id)
  // so re-renders with the same pages array do not produce duplicates in the store.
  useEffect(() => {
    const lastPage = query.data?.pages.at(-1);
    if (lastPage) {
      appendCards(lastPage.cards);
    }
  }, [query.data?.pages, appendCards]);

  return {
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isPending: query.isPending,
    isError: query.isError,
  };
}

// ── useSwipeAction ────────────────────────────────────────────────────────

/**
 * Mutation hook wrapping the recordSwipe server action.
 *
 * Returns mutate (fire-and-forget), mutateAsync (awaitable), and isPending.
 * Optimistic state is owned by the Zustand store — this hook is a thin
 * transport layer only.
 */
export function useSwipeAction() {
  const mutation = useMutation({
    mutationFn: ({
      toId,
      direction,
    }: {
      toId: string;
      direction: SwipeDirection;
    }) => recordSwipe(toId, direction),
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
  };
}

// ── useMatchNotification ──────────────────────────────────────────────────

/**
 * Pure Zustand selector for the current match notification.
 *
 * Returns the SwipeResult when a match is pending, or null when cleared.
 * No React Query involvement — match state lives entirely in the swipe store.
 */
export function useMatchNotification(): SwipeResult | null {
  return useSwipeStore((s) => s.currentMatch);
}
