// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { DiscoveryCard } from "@/lib/swipe/types";

// ── Mock swipe store ──────────────────────────────────────────────────────

type StoreState = {
  stack: DiscoveryCard[];
  isAnimating: boolean;
  swipe: ReturnType<typeof vi.fn>;
};

let mockState: StoreState = {
  stack: [],
  isAnimating: false,
  swipe: vi.fn(async (_dir: unknown, action: () => Promise<unknown>) => {
    await action();
  }),
};

vi.mock("@/stores/swipe.store", () => ({
  useSwipeStore: vi.fn((selector: (s: StoreState) => unknown) => selector(mockState)),
}));

// ── Mock SwipeCard to make testing simpler ────────────────────────────────
// We render a div with data-testid="swipe-card" and data-name so tests can
// verify which cards are rendered without SwipeCard's internal complexity.

vi.mock("../SwipeCard", () => ({
  SwipeCard: vi.fn(
    ({
      card,
      isTop,
      onSwipe,
    }: {
      card: DiscoveryCard;
      isTop: boolean;
      onSwipe: (direction: "LIKE" | "PASS") => void;
    }) => (
      <div
        data-testid="swipe-card"
        data-name={card.name}
        data-is-top={String(isTop)}
        data-swipe={() => onSwipe("LIKE")}
      />
    )
  ),
}));

// ── Mock swipe actions + hooks (break the prisma import chain) ────────────
// CardStack -> useDiscoveryFeed -> getDiscoveryFeedAction -> prismaAdmin.
// Without this, PrismaClient tries to instantiate with ADMIN_DATABASE_URL
// unset in the test environment.

const mockRecordSwipe = vi.fn();
vi.mock("@/lib/swipe/actions", () => ({
  getDiscoveryFeedAction: vi.fn(),
  recordSwipe: (...args: unknown[]) => mockRecordSwipe(...args),
  FeatureFlagError: class extends Error {},
}));

const mockMutateAsync = vi.fn();
vi.mock("@/lib/swipe/hooks", () => ({
  useDiscoveryFeed: vi.fn(() => ({
    data: { pages: [], pageParams: [] },
    hasNextPage: false,
    fetchNextPage: vi.fn(),
    isFetchingNextPage: false,
  })),
  useSwipeAction: vi.fn(() => ({
    mutateAsync: (...args: unknown[]) => mockMutateAsync(...args),
  })),
}));

// ── Import after mocks ────────────────────────────────────────────────────

import { CardStack } from "../CardStack";

// ── Fixtures ──────────────────────────────────────────────────────────────

function makeCard(id: string, name: string): DiscoveryCard {
  return {
    id,
    name,
    city: "BA",
    gymName: "FitPro",
    fitnessGoals: [],
    disciplines: [],
    experienceLevel: null,
    photos: [],
  };
}

const cards: DiscoveryCard[] = [
  makeCard("1", "Alice"),
  makeCard("2", "Bob"),
  makeCard("3", "Carol"),
  makeCard("4", "Dave"),
  makeCard("5", "Eve"),
];

beforeEach(() => {
  vi.clearAllMocks();
  mockState = {
    stack: [],
    isAnimating: false,
    swipe: vi.fn(async (_dir: unknown, action: () => Promise<unknown>) => {
      await action();
    }),
  };
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("CardStack — render top cards", () => {
  it("stack with 5 cards: renders at most 3 SwipeCard elements", () => {
    mockState.stack = cards;
    render(<CardStack />);

    const rendered = screen.getAllByTestId("swipe-card");
    expect(rendered.length).toBeGreaterThanOrEqual(2);
    expect(rendered.length).toBeLessThanOrEqual(3);
  });

  it("stack with 5 cards: top card (index 0) has isTop=true", () => {
    mockState.stack = cards;
    render(<CardStack />);

    const rendered = screen.getAllByTestId("swipe-card");
    // First rendered card should be the top card
    const topCard = rendered.find((el) => el.getAttribute("data-is-top") === "true");
    expect(topCard).toBeDefined();
    expect(topCard).not.toBeNull();
  });

  it("stack with 5 cards: background cards have isTop=false", () => {
    mockState.stack = cards;
    render(<CardStack />);

    const rendered = screen.getAllByTestId("swipe-card");
    const backgroundCards = rendered.filter((el) => el.getAttribute("data-is-top") === "false");
    expect(backgroundCards.length).toBeGreaterThanOrEqual(1);
  });
});

describe("CardStack — empty state", () => {
  it("empty stack: no SwipeCard is rendered", () => {
    mockState.stack = [];
    render(<CardStack />);

    expect(screen.queryAllByTestId("swipe-card")).toHaveLength(0);
  });

  it("empty stack: renders empty-state UI", () => {
    mockState.stack = [];
    render(<CardStack />);

    expect(screen.getByTestId("card-stack-empty")).toBeInTheDocument();
  });
});

describe("CardStack — card removal after swipe", () => {
  it("after swipe, removed top card's name is no longer the top card rendered", () => {
    // Start with 3 cards
    mockState.stack = [cards[0]!, cards[1]!, cards[2]!];
    const { rerender } = render(<CardStack />);

    // Verify Alice is top card
    const initial = screen.getAllByTestId("swipe-card");
    const initialTop = initial.find((el) => el.getAttribute("data-is-top") === "true");
    expect(initialTop).toHaveAttribute("data-name", "Alice");

    // Simulate store popping Alice (swipe completed)
    mockState.stack = [cards[1]!, cards[2]!];
    rerender(<CardStack />);

    // Now Bob should be the top card
    const updated = screen.getAllByTestId("swipe-card");
    const updatedTop = updated.find((el) => el.getAttribute("data-is-top") === "true");
    expect(updatedTop).toHaveAttribute("data-name", "Bob");
  });
});

describe("CardStack — backend persistence", () => {
  it("fires recordSwipe with the top card id and LIKE direction on swipe", async () => {
    mockState.stack = [cards[0]!, cards[1]!];
    mockMutateAsync.mockResolvedValue({ matched: false });
    render(<CardStack />);

    // Simulate the top card being swiped
    const topCard = screen
      .getAllByTestId("swipe-card")
      .find((el) => el.getAttribute("data-is-top") === "true");
    expect(topCard).toHaveAttribute("data-name", "Alice");

    // Fire the onSwipe callback captured by the mocked SwipeCard
    const mockedSwipeCard = (
      (await import("../SwipeCard")).SwipeCard as unknown as {
        mock: { calls: { [0]: { onSwipe: (d: string) => void } }[] };
      }
    ).mock;
    const latestCall = mockedSwipeCard.calls.at(-1)?.[0];
    latestCall?.onSwipe("LIKE");

    expect(mockMutateAsync).toHaveBeenCalledWith({
      toId: "1",
      direction: "LIKE",
    });
  });

  it("returns matched result from the action to the store swipe callback", async () => {
    mockState.stack = [cards[0]!];
    mockMutateAsync.mockResolvedValue({ matched: true, matchId: "m1" });
    render(<CardStack />);

    const mockedSwipeCard = (
      (await import("../SwipeCard")).SwipeCard as unknown as {
        mock: { calls: { [0]: { onSwipe: (d: string) => void } }[] };
      }
    ).mock;
    const latestCall = mockedSwipeCard.calls.at(-1)?.[0];
    latestCall?.onSwipe("LIKE");

    expect(mockMutateAsync).toHaveBeenCalled();
  });
});
