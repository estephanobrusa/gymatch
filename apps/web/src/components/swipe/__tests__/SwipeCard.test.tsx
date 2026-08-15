// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import type { DiscoveryCard } from "@gymatch/core";

// ── Mock useDrag ──────────────────────────────────────────────────────────
// We control useDrag from outside so we can simulate drag state and trigger
// onRelease — this lets SwipeCard tests remain pure unit tests.

type ReleaseFn = (deltaX: number) => void;
let capturedOnRelease: ReleaseFn = () => {};

const mockDragState = { deltaX: 0, isDragging: false };

vi.mock("@/hooks/use-drag", () => ({
  useDrag: vi.fn((options: { onRelease: ReleaseFn }) => {
    capturedOnRelease = options.onRelease;
    return {
      ...mockDragState,
      bind: {
        onPointerDown: vi.fn(),
        onPointerMove: vi.fn(),
        onPointerUp: vi.fn(),
        onPointerCancel: vi.fn(),
      },
    };
  }),
}));

// ── Mock swipe store ──────────────────────────────────────────────────────

const mockSwipe = vi.fn();
vi.mock("@gymatch/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gymatch/core")>();
  return {
    ...actual,
    useSwipeStore: vi.fn((selector: (s: { swipe: typeof mockSwipe; isAnimating: boolean }) => unknown) =>
      selector({ swipe: mockSwipe, isAnimating: false })
    ),
  };
});

// ── Mock moderation actions (prevent Prisma from instantiating in tests) ──

vi.mock("@/lib/moderation/actions", () => ({
  reportUserAction: vi.fn(),
  blockUserAction: vi.fn(),
}));

// ── Mock sonner (used by ReportModal + BlockConfirmDialog) ────────────────

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// ── Import after mocks ────────────────────────────────────────────────────

import { SwipeCard } from "../SwipeCard";

// ── Fixtures ──────────────────────────────────────────────────────────────

const cardWithPhoto: DiscoveryCard = {
  id: "1",
  name: "Alice",
  city: "Buenos Aires",
  gymName: "FitPro",
  fitnessGoals: ["weight-loss"],
  disciplines: ["crossfit"],
  experienceLevel: "intermediate",
  photos: [{ url: "https://example.com/alice.jpg", position: 0 }],
};

const cardNoPhoto: DiscoveryCard = {
  ...cardWithPhoto,
  id: "2",
  name: "Bob",
  photos: [],
};

function renderCard(overrides: Partial<Parameters<typeof SwipeCard>[0]> = {}) {
  const onSwipe = vi.fn();
  render(
    <SwipeCard
      card={cardWithPhoto}
      isTop={true}
      zIndex={10}
      onSwipe={onSwipe}
      {...overrides}
    />
  );
  return { onSwipe };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDragState.deltaX = 0;
  mockDragState.isDragging = false;
  capturedOnRelease = () => {};
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("SwipeCard — render card data", () => {
  it("renders photo as hero image when photos[0] is set", () => {
    renderCard({ card: cardWithPhoto });

    const img = screen.getByRole("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", cardWithPhoto.photos[0]?.url);
  });

  it("renders name, gym text when card has data", () => {
    renderCard({ card: cardWithPhoto });

    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    expect(screen.getByText(/FitPro/)).toBeInTheDocument();
  });

  it("renders placeholder when photos array is empty — no broken img", () => {
    renderCard({ card: cardNoPhoto });

    // No img element when there are no photos
    expect(screen.queryByRole("img")).toBeNull();
    // Fallback gradient div is present (no testid needed — absence of img is the assertion)
  });
});

describe("SwipeCard — drag interaction", () => {
  it("drag below threshold (60px): no swipe called on release", () => {
    const { onSwipe } = renderCard();

    act(() => {
      capturedOnRelease(60);
    });

    expect(onSwipe).not.toHaveBeenCalled();
  });

  it("drag past threshold right (+90px): onSwipe('LIKE') is called", async () => {
    const { onSwipe } = renderCard();

    act(() => {
      capturedOnRelease(90);
    });

    // onSwipe is deferred via setTimeout(0) to avoid setState-during-render
    await waitFor(() => expect(onSwipe).toHaveBeenCalledOnce());
    expect(onSwipe).toHaveBeenCalledWith("LIKE");
  });

  it("drag past threshold left (-90px): onSwipe('PASS') is called", async () => {
    const { onSwipe } = renderCard();

    act(() => {
      capturedOnRelease(-90);
    });

    await waitFor(() => expect(onSwipe).toHaveBeenCalledOnce());
    expect(onSwipe).toHaveBeenCalledWith("PASS");
  });
});

describe("SwipeCard — accessibility", () => {
  it("renders with role=article and aria-label containing name and city", () => {
    renderCard({ card: cardWithPhoto });

    const article = screen.getByRole("article");
    expect(article).toBeInTheDocument();
    expect(article).toHaveAttribute("aria-label", expect.stringContaining("Alice"));
    expect(article).toHaveAttribute("aria-label", expect.stringContaining("Buenos Aires"));
  });
});
