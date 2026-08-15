// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import type { Mock } from "vitest";

// ── Mocks — declared before all imports ───────────────────────────────────

vi.mock("../actions", () => ({
  getDiscoveryFeedAction: vi.fn(),
  recordSwipe: vi.fn(),
}));

// ── Production imports ─────────────────────────────────────────────────────

import { getDiscoveryFeedAction, recordSwipe } from "../actions";
import { useSwipeStore } from "@gymatch/core";
import { useDiscoveryFeed, useSwipeAction, useMatchNotification } from "../hooks";

const mockGetDiscoveryFeedAction = getDiscoveryFeedAction as Mock;
const mockRecordSwipe = recordSwipe as Mock;

// ── Wrapper factory ────────────────────────────────────────────────────────

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: 0, gcTime: 0 },
      mutations: { retry: 0 },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };
}

// ── Sample data ───────────────────────────────────────────────────────────

const card1 = {
  id: "c1",
  name: "Alice",
  city: "BA",
  gymName: "CrossFit BA",
  fitnessGoals: ["STRENGTH"],
  disciplines: ["WEIGHTLIFTING"],
  experienceLevel: "INTERMEDIATE",
  photos: [{ url: "https://example.com/a.jpg", position: 0 }],
};

const card2 = {
  id: "c2",
  name: "Bob",
  city: "Rosario",
  gymName: null,
  fitnessGoals: ["CARDIO"],
  disciplines: ["RUNNING"],
  experienceLevel: "BEGINNER",
  photos: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  // Reset Zustand store state between tests
  useSwipeStore.setState({
    stack: [],
    currentMatch: null,
    isAnimating: false,
    lastSwiped: null,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── useDiscoveryFeed ──────────────────────────────────────────────────────

describe("useDiscoveryFeed", () => {
  it("starts as isPending=true and resolves to first page, calling appendCards once", async () => {
    mockGetDiscoveryFeedAction.mockResolvedValueOnce({
      cards: [card1],
      nextCursor: null,
    });

    const { result } = renderHook(() => useDiscoveryFeed(), {
      wrapper: makeWrapper(),
    });

    // Initially loading
    expect(result.current.isPending).toBe(true);

    await waitFor(() => expect(result.current.isPending).toBe(false));

    // Stack has the card from appendCards
    const stack = useSwipeStore.getState().stack;
    expect(stack).toHaveLength(1);
    expect(stack[0]?.id).toBe("c1");
    expect(mockGetDiscoveryFeedAction).toHaveBeenCalledOnce();
  });

  it("fetchNextPage uses nextCursor from previous page and calls appendCards with new cards only", async () => {
    // First page
    mockGetDiscoveryFeedAction.mockResolvedValueOnce({
      cards: [card1],
      nextCursor: "cursor-after-c1",
    });
    // Second page
    mockGetDiscoveryFeedAction.mockResolvedValueOnce({
      cards: [card2],
      nextCursor: null,
    });

    const { result } = renderHook(() => useDiscoveryFeed(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.hasNextPage).toBe(true);

    act(() => {
      result.current.fetchNextPage();
    });

    await waitFor(() => expect(result.current.isFetchingNextPage).toBe(false));

    // Second call must use the cursor from the first page
    expect(mockGetDiscoveryFeedAction).toHaveBeenCalledWith("cursor-after-c1");

    // Both cards must be in the store
    const stack = useSwipeStore.getState().stack;
    expect(stack.some((c) => c.id === "c1")).toBe(true);
    expect(stack.some((c) => c.id === "c2")).toBe(true);
  });

  it("empty feed sets hasNextPage: false and calls appendCards without crash", async () => {
    mockGetDiscoveryFeedAction.mockResolvedValueOnce({
      cards: [],
      nextCursor: null,
    });

    const { result } = renderHook(() => useDiscoveryFeed(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.hasNextPage).toBe(false);
    // Store stack remains empty — appendCards([]) must not throw
    expect(useSwipeStore.getState().stack).toHaveLength(0);
  });

  it("network error results in isError: true and appendCards is NOT called", async () => {
    mockGetDiscoveryFeedAction.mockRejectedValueOnce(new Error("Network failure"));

    const { result } = renderHook(() => useDiscoveryFeed(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // appendCards must not have been called — stack stays empty
    expect(useSwipeStore.getState().stack).toHaveLength(0);
  });
});

// ── useSwipeAction ────────────────────────────────────────────────────────

describe("useSwipeAction", () => {
  it("mutate calls recordSwipe with correct args and isPending toggles", async () => {
    let resolveRecordSwipe!: (value: { matched: boolean }) => void;
    mockRecordSwipe.mockReturnValueOnce(
      new Promise<{ matched: boolean }>((res) => {
        resolveRecordSwipe = res;
      })
    );

    const { result } = renderHook(() => useSwipeAction(), {
      wrapper: makeWrapper(),
    });

    act(() => {
      result.current.mutate({ toId: "u2", direction: "LIKE" });
    });

    // isPending while mutation is in-flight
    await waitFor(() => expect(result.current.isPending).toBe(true));

    expect(mockRecordSwipe).toHaveBeenCalledWith("u2", "LIKE");

    resolveRecordSwipe({ matched: false });
    await waitFor(() => expect(result.current.isPending).toBe(false));
  });

  it("recordSwipe throws → mutation isError is true", async () => {
    mockRecordSwipe.mockRejectedValueOnce(new Error("Server error"));

    const { result } = renderHook(() => useSwipeAction(), {
      wrapper: makeWrapper(),
    });

    act(() => {
      result.current.mutate({ toId: "u2", direction: "PASS" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isPending).toBe(false);
  });
});

// ── useMatchNotification ──────────────────────────────────────────────────

describe("useMatchNotification", () => {
  it("returns null when currentMatch is null", () => {
    useSwipeStore.setState({ currentMatch: null });

    const { result } = renderHook(() => useMatchNotification());

    expect(result.current).toBeNull();
  });

  it("returns match reactively when store sets currentMatch", () => {
    useSwipeStore.setState({ currentMatch: null });

    const { result } = renderHook(() => useMatchNotification());

    expect(result.current).toBeNull();

    const matchData = {
      matched: true,
      matchId: "match-42",
      matchedUser: { id: "u99", name: "Carol", photos: [] },
    };

    act(() => {
      useSwipeStore.setState({ currentMatch: matchData });
    });

    expect(result.current).toEqual(matchData);
    expect(result.current?.matchId).toBe("match-42");
  });

  it("returns null after match cleared from store", () => {
    const matchData = {
      matched: true,
      matchId: "match-7",
      matchedUser: { id: "u5", name: "Dave", photos: [] },
    };
    useSwipeStore.setState({ currentMatch: matchData });

    const { result } = renderHook(() => useMatchNotification());

    expect(result.current?.matchId).toBe("match-7");

    act(() => {
      useSwipeStore.getState().clearMatch();
    });

    expect(result.current).toBeNull();
  });
});
