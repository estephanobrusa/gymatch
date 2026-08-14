// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { SwipeResult } from "@/lib/swipe/types";

// ── Mock swipe store ──────────────────────────────────────────────────────

type StoreState = {
  currentMatch: SwipeResult | null;
  clearMatch: ReturnType<typeof vi.fn>;
};

let mockState: StoreState = {
  currentMatch: null,
  clearMatch: vi.fn(),
};

vi.mock("@/stores/swipe.store", () => ({
  useSwipeStore: vi.fn((selector: (s: StoreState) => unknown) => selector(mockState)),
}));

// ── Mock ShadCN Dialog to keep tests deterministic ────────────────────────
// Radix Dialog uses portals + animations that complicate jsdom; we mock the
// compound components so tests only verify our logic, not Radix internals.

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; onOpenChange: (v: boolean) => void; children: React.ReactNode }) => (
    open ? <div data-testid="dialog-root">{children}</div> : null
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
}));

// ── Mock chat actions (break the prisma import chain) ─────────────────────
// MatchModal -> getConversationIdAction -> prismaAdmin. Without this,
// PrismaClient tries to instantiate with ADMIN_DATABASE_URL unset in tests.

vi.mock("@/lib/chat/actions", () => ({
  getConversationIdAction: vi.fn(),
}));

// ── Mock next/navigation (MatchModal uses useRouter) ──────────────────────

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

// ── Import after mocks ────────────────────────────────────────────────────

import React from "react";
import { MatchModal } from "../MatchModal";

// ── Fixtures ──────────────────────────────────────────────────────────────

const matchResult: SwipeResult = {
  matched: true,
  matchId: "match-123",
  matchedUser: {
    id: "user-456",
    name: "Carolina",
    photos: [{ url: "https://example.com/photo.jpg", position: 0 }],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockState = {
    currentMatch: null,
    clearMatch: vi.fn(),
  };
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("MatchModal — appear on match", () => {
  it("modal hidden when currentMatch is null", () => {
    mockState.currentMatch = null;
    render(<MatchModal />);

    expect(screen.queryByTestId("dialog-root")).not.toBeInTheDocument();
  });

  it("modal open when currentMatch is set, shows matched user name", () => {
    mockState.currentMatch = matchResult;
    render(<MatchModal />);

    expect(screen.getByTestId("dialog-root")).toBeInTheDocument();
    expect(screen.getByText("Carolina")).toBeInTheDocument();
  });
});

describe("MatchModal — dismiss clears match", () => {
  it("closing the dialog calls store.clearMatch()", () => {
    // Simulate dialog open then close via onOpenChange(false)
    // Our mock Dialog calls onOpenChange when closed; we simulate it by
    // finding a close button we'll add to MatchModal.
    mockState.currentMatch = matchResult;
    render(<MatchModal />);

    const closeBtn = screen.getByRole("button", { name: /close|dismiss/i });
    fireEvent.click(closeBtn);

    expect(mockState.clearMatch).toHaveBeenCalledTimes(1);
  });
});
