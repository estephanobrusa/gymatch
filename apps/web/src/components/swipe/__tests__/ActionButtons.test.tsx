// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ── Mock swipe store ──────────────────────────────────────────────────────

type StoreState = {
  isAnimating: boolean;
  stack: { id: string }[];
  swipe: ReturnType<typeof vi.fn>;
};

let mockState: StoreState = {
  isAnimating: false,
  stack: [],
  swipe: vi.fn(),
};

vi.mock("@/stores/swipe.store", () => ({
  useSwipeStore: vi.fn((selector: (s: StoreState) => unknown) => selector(mockState)),
}));

// ── Mock swipe hooks (break the prisma import chain) ──────────────────────
const mockMutateAsync = vi.fn();
vi.mock("@/lib/swipe/hooks", () => ({
  useSwipeAction: vi.fn(() => ({
    mutateAsync: (...args: unknown[]) => mockMutateAsync(...args),
  })),
}));

// ── Import after mocks ────────────────────────────────────────────────────

import { ActionButtons } from "../ActionButtons";

// ── Helpers ───────────────────────────────────────────────────────────────

const originalEnv = process.env;

beforeEach(() => {
  vi.clearAllMocks();
  mockState = {
    isAnimating: false,
    stack: [],
    swipe: vi.fn(),
  };
  process.env = { ...originalEnv };
  delete process.env.NEXT_PUBLIC_FEATURE_SUPER_LIKE;
});

afterEach(() => {
  process.env = originalEnv;
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("ActionButtons — renders buttons", () => {
  it("renders Nope button with aria-label='Nope'", () => {
    render(<ActionButtons />);
    expect(screen.getByRole("button", { name: "Nope" })).toBeInTheDocument();
  });

  it("renders Like button with aria-label='Like'", () => {
    render(<ActionButtons />);
    expect(screen.getByRole("button", { name: "Like" })).toBeInTheDocument();
  });

  it("does not render legacy unicode symbols (✕, ♥, ★) as text content", () => {
    const { container } = render(<ActionButtons />);
    const text = container.textContent ?? "";
    expect(text).not.toContain("✕");
    expect(text).not.toContain("♥");
    expect(text).not.toContain("★");
  });
});

describe("ActionButtons — swipe triggers", () => {
  it("clicking Like calls store.swipe('LIKE') with the top card id", () => {
    mockState.stack = [{ id: "card-1" }];
    render(<ActionButtons />);

    fireEvent.click(screen.getByRole("button", { name: /like/i }));

    expect(mockState.swipe).toHaveBeenCalledWith("LIKE", expect.any(Function));
  });

  it("clicking Nope calls store.swipe('PASS') with the top card id", () => {
    mockState.stack = [{ id: "card-1" }];
    render(<ActionButtons />);

    fireEvent.click(screen.getByRole("button", { name: /nope|pass/i }));

    expect(mockState.swipe).toHaveBeenCalledWith("PASS", expect.any(Function));
  });

  it("the swipe action calls mutateAsync with the top card id and direction", async () => {
    mockState.stack = [{ id: "card-1" }];
    mockMutateAsync.mockResolvedValue({ matched: false });
    render(<ActionButtons />);

    fireEvent.click(screen.getByRole("button", { name: /like/i }));

    // Capture the action passed to the store and execute it
    const [, action] = mockState.swipe.mock.calls[0] as [string, () => Promise<unknown>];
    await action();

    expect(mockMutateAsync).toHaveBeenCalledWith({
      toId: "card-1",
      direction: "LIKE",
    });
  });

  it("does not swipe when the stack is empty", () => {
    render(<ActionButtons />);

    fireEvent.click(screen.getByRole("button", { name: /like/i }));

    expect(mockState.swipe).not.toHaveBeenCalled();
  });
});

describe("ActionButtons — disabled during animation", () => {
  it("when isAnimating=true, Like and Nope buttons are disabled", () => {
    mockState.isAnimating = true;
    render(<ActionButtons />);

    expect(screen.getByRole("button", { name: /like/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /nope|pass/i })).toBeDisabled();
  });

  it("when isAnimating=false, buttons are enabled", () => {
    mockState.isAnimating = false;
    render(<ActionButtons />);

    expect(screen.getByRole("button", { name: /like/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /nope|pass/i })).not.toBeDisabled();
  });
});

describe("ActionButtons — super-like feature flag", () => {
  it("flag off (unset): no super-like button in DOM", () => {
    render(<ActionButtons />);

    expect(screen.queryByRole("button", { name: /super.?like/i })).not.toBeInTheDocument();
  });

  it("flag on (NEXT_PUBLIC_FEATURE_SUPER_LIKE=true): super-like button is visible", () => {
    process.env.NEXT_PUBLIC_FEATURE_SUPER_LIKE = "true";
    render(<ActionButtons />);

    expect(screen.getByRole("button", { name: /super.?like/i })).toBeInTheDocument();
  });
});
