import { useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useSwipeStore } from "@gymatch/core";

import { getDiscoveryFeed } from "@/lib/api/client";

/**
 * Infinite query for the discovery feed, synced into the swipe store.
 *
 * The first time data arrives the store is (re)loaded with every fetched
 * page; afterwards only the newest page is appended (idempotent by card id).
 * A `syncedRef` guarantees the "first sync" only happens once per mount, so
 * revisiting the screen restores the full cached stack instead of doubling it.
 */
export function useDiscoveryFeed(token: string | null) {
  const loadStack = useSwipeStore((s) => s.loadStack);
  const appendCards = useSwipeStore((s) => s.appendCards);
  const syncedRef = useRef(false);

  const query = useInfiniteQuery({
    queryKey: ["discovery-feed"],
    queryFn: ({ pageParam }) => getDiscoveryFeed(token ?? "", pageParam ?? undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!token,
  });

  useEffect(() => {
    const pages = query.data?.pages;
    if (!pages || pages.length === 0) return;

    if (!syncedRef.current) {
      syncedRef.current = true;
      loadStack(pages.flatMap((page) => page.cards));
      return;
    }

    const lastPage = pages[pages.length - 1];
    if (lastPage) appendCards(lastPage.cards);
  }, [query.data?.pages, loadStack, appendCards]);

  return {
    isPending: query.isPending,
    isError: query.isError,
    refetch: query.refetch,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
  };
}

export interface DiscoveryFeedControls {
  fetchNextPage: () => Promise<unknown>;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}