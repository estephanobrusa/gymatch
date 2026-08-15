// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ── Mock swipe store ──────────────────────────────────────────────────────

type StoreState = {
  stack: { id: string; name: string }[];
  isAnimating: boolean;
  currentMatch: null;
  swipe: ReturnType<typeof vi.fn>;
  clearMatch: ReturnType<typeof vi.fn>;
};

let mockState: StoreState = {
  stack: [],
  isAnimating: false,
  currentMatch: null,
  swipe: vi.fn(),
  clearMatch: vi.fn(),
};

vi.mock("@gymatch/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gymatch/core")>();
  return {
    ...actual,
    useSwipeStore: vi.fn((selector: (s: StoreState) => unknown) => selector(mockState)),
  };
});

// ── Mock hooks ────────────────────────────────────────────────────────────

type FeedState = {
  isPending: boolean;
  isError: boolean;
  fetchNextPage: ReturnType<typeof vi.fn>;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
};

let mockFeedState: FeedState = {
  isPending: false,
  isError: false,
  fetchNextPage: vi.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
};

vi.mock("@/lib/swipe/hooks", () => ({
  useDiscoveryFeed: vi.fn(() => mockFeedState),
  useSwipeAction: vi.fn(() => ({
    mutateAsync: vi.fn(),
    mutate: vi.fn(),
    isPending: false,
    isError: false,
  })),
}));

// ── Mock child components to isolate DiscoveryPage logic ──────────────────

vi.mock("../CardStack", () => ({
  CardStack: () => <div data-testid="card-stack" />,
}));

vi.mock("../ActionButtons", () => ({
  ActionButtons: () => <div data-testid="action-buttons" />,
}));

vi.mock("../MatchModal", () => ({
  MatchModal: () => <div data-testid="match-modal" />,
}));

// ── Import after mocks ────────────────────────────────────────────────────

import { DiscoveryPage } from "../DiscoveryPage";

// ── Fixtures ──────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockState = {
    stack: [],
    isAnimating: false,
    currentMatch: null,
    swipe: vi.fn(),
    clearMatch: vi.fn(),
  };
  mockFeedState = {
    isPending: false,
    isError: false,
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  };
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("DiscoveryPage — loaded state", () => {
  it("shows CardStack and ActionButtons when feed is loaded", () => {
    mockFeedState.isPending = false;
    mockFeedState.isError = false;

    render(<DiscoveryPage />);

    expect(screen.getByTestId("card-stack")).toBeInTheDocument();
    expect(screen.getByTestId("action-buttons")).toBeInTheDocument();
  });

  it("always renders MatchModal regardless of loading state", () => {
    render(<DiscoveryPage />);

    expect(screen.getByTestId("match-modal")).toBeInTheDocument();
  });
});

describe("DiscoveryPage — loading state", () => {
  it("hides CardStack when isPending is true", () => {
    mockFeedState.isPending = true;

    render(<DiscoveryPage />);

    expect(screen.queryByTestId("card-stack")).not.toBeInTheDocument();
  });

  it("shows loading indicator when isPending is true", () => {
    mockFeedState.isPending = true;

    render(<DiscoveryPage />);

    // Should show some loading UI
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});

describe("DiscoveryPage — error state", () => {
  it("hides CardStack when isError is true", () => {
    mockFeedState.isError = true;

    render(<DiscoveryPage />);

    expect(screen.queryByTestId("card-stack")).not.toBeInTheDocument();
  });

  it("shows error message when isError is true", () => {
    mockFeedState.isError = true;

    render(<DiscoveryPage />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
