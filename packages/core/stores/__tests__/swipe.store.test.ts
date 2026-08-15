import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { useSwipeStore } from "../swipe.store";
import type { DiscoveryCard, SwipeResult } from "../../lib/swipe/types";

// ── Fixtures ────────────────────────────────────────────────────────────────

const cardA: DiscoveryCard = {
  id: "1",
  name: "Alice",
  city: "Buenos Aires",
  gymName: "FitPro",
  fitnessGoals: ["weight-loss"],
  disciplines: ["crossfit"],
  experienceLevel: "intermediate",
  photos: [],
};

const cardB: DiscoveryCard = {
  id: "2",
  name: "Bob",
  city: "Córdoba",
  gymName: "IronGym",
  fitnessGoals: ["muscle-gain"],
  disciplines: ["powerlifting"],
  experienceLevel: "advanced",
  photos: [],
};

const cardC: DiscoveryCard = {
  id: "3",
  name: "Carol",
  city: null,
  gymName: null,
  fitnessGoals: [],
  disciplines: [],
  experienceLevel: null,
  photos: [],
};

// ── Reset store state before each test ─────────────────────────────────────

beforeEach(() => {
  useSwipeStore.setState({
    stack: [],
    currentMatch: null,
    isAnimating: false,
  });
});

// ── loadStack ───────────────────────────────────────────────────────────────

describe("loadStack", () => {
  it("initial load: sets stack and clears currentMatch", () => {
    useSwipeStore.getState().loadStack([cardA, cardB]);

    const { stack, currentMatch } = useSwipeStore.getState();
    expect(stack).toHaveLength(2);
    expect(stack[0]).toEqual(cardA);
    expect(stack[1]).toEqual(cardB);
    expect(currentMatch).toBeNull();
  });

  it("reload: replaces existing stack and resets currentMatch", () => {
    // Pre-condition: stack has cardA, match is set
    useSwipeStore.setState({
      stack: [cardA],
      currentMatch: { matched: true, matchId: "m1" },
    });

    useSwipeStore.getState().loadStack([cardB, cardC]);

    const { stack, currentMatch } = useSwipeStore.getState();
    expect(stack).toHaveLength(2);
    expect(stack[0]).toEqual(cardB);
    expect(stack[1]).toEqual(cardC);
    expect(currentMatch).toBeNull();
  });

  it("loadStack with empty array: clears stack and resets currentMatch", () => {
    useSwipeStore.setState({ stack: [cardA], currentMatch: { matched: true } });

    useSwipeStore.getState().loadStack([]);

    const { stack, currentMatch } = useSwipeStore.getState();
    expect(stack).toHaveLength(0);
    expect(currentMatch).toBeNull();
  });
});

// ── appendCards ─────────────────────────────────────────────────────────────

describe("appendCards", () => {
  it("appends new cards to the existing stack", () => {
    useSwipeStore.setState({ stack: [cardA] });

    useSwipeStore.getState().appendCards([cardB, cardC]);

    const { stack } = useSwipeStore.getState();
    expect(stack).toHaveLength(3);
    expect(stack[0]).toEqual(cardA);
    expect(stack[1]).toEqual(cardB);
    expect(stack[2]).toEqual(cardC);
  });

  it("deduplication: card with existing id is not added again", () => {
    useSwipeStore.setState({ stack: [cardA] });

    useSwipeStore.getState().appendCards([cardA, cardB]);

    const { stack } = useSwipeStore.getState();
    expect(stack).toHaveLength(2);
    expect(stack[0]).toEqual(cardA);
    expect(stack[1]).toEqual(cardB);
  });

  it("appends to empty stack", () => {
    useSwipeStore.getState().appendCards([cardA]);

    const { stack } = useSwipeStore.getState();
    expect(stack).toHaveLength(1);
    expect(stack[0]).toEqual(cardA);
  });

  it("appendCards with empty array: stack unchanged", () => {
    useSwipeStore.setState({ stack: [cardA] });

    useSwipeStore.getState().appendCards([]);

    expect(useSwipeStore.getState().stack).toHaveLength(1);
  });
});

// ── swipe — happy path ───────────────────────────────────────────────────────

describe("swipe — happy path", () => {
  it("no match: removes top card, currentMatch stays null, isAnimating false", async () => {
    useSwipeStore.setState({ stack: [cardA, cardB], isAnimating: false });

    const action = vi.fn().mockResolvedValue({ matched: false } satisfies SwipeResult);
    await useSwipeStore.getState().swipe("LIKE", action);

    const { stack, currentMatch, isAnimating } = useSwipeStore.getState();
    expect(stack).toHaveLength(1);
    expect(stack[0]).toEqual(cardB);
    expect(currentMatch).toBeNull();
    expect(isAnimating).toBe(false);
  });

  it("match: removes top card, sets currentMatch, isAnimating false", async () => {
    useSwipeStore.setState({ stack: [cardA], isAnimating: false });

    const matchResult: SwipeResult = { matched: true, matchId: "m1" };
    const action = vi.fn().mockResolvedValue(matchResult);
    await useSwipeStore.getState().swipe("LIKE", action);

    const { stack, currentMatch, isAnimating } = useSwipeStore.getState();
    expect(stack).toHaveLength(0);
    expect(currentMatch).toEqual(matchResult);
    expect(isAnimating).toBe(false);
  });

  it("isAnimating guard: second concurrent swipe returns immediately without mutating state", async () => {
    useSwipeStore.setState({ stack: [cardA, cardB], isAnimating: true });

    const action = vi.fn().mockResolvedValue({ matched: false });
    await useSwipeStore.getState().swipe("LIKE", action);

    // State must be untouched because guard fired
    expect(action).not.toHaveBeenCalled();
    expect(useSwipeStore.getState().stack).toHaveLength(2);
  });

  it("swipe on empty stack: no-op", async () => {
    useSwipeStore.setState({ stack: [], isAnimating: false });

    const action = vi.fn().mockResolvedValue({ matched: false });
    await useSwipeStore.getState().swipe("LIKE", action);

    expect(action).not.toHaveBeenCalled();
    expect(useSwipeStore.getState().stack).toHaveLength(0);
  });
});

// ── swipe — optimistic rollback ──────────────────────────────────────────────

describe("swipe — optimistic rollback", () => {
  it("action rejects: card restored to top of stack, isAnimating false, currentMatch null", async () => {
    useSwipeStore.setState({ stack: [cardA, cardB], isAnimating: false });

    const action = vi.fn().mockRejectedValue(new Error("network"));
    await useSwipeStore.getState().swipe("LIKE", action);

    const { stack, currentMatch, isAnimating } = useSwipeStore.getState();
    expect(stack).toHaveLength(2);
    expect(stack[0]).toEqual(cardA); // card A restored to the top
    expect(stack[1]).toEqual(cardB);
    expect(currentMatch).toBeNull();
    expect(isAnimating).toBe(false);
  });
});

// ── clearMatch ───────────────────────────────────────────────────────────────

describe("clearMatch", () => {
  it("sets currentMatch to null without touching the stack", () => {
    useSwipeStore.setState({ stack: [cardA], currentMatch: { matched: true, matchId: "m1" } });

    useSwipeStore.getState().clearMatch();

    const { stack, currentMatch } = useSwipeStore.getState();
    expect(currentMatch).toBeNull();
    expect(stack).toHaveLength(1);
    expect(stack[0]).toEqual(cardA);
  });
});

// ── rewind (feature-flagged) ─────────────────────────────────────────────────

describe("rewind", () => {
  const ENV_KEY = "NEXT_PUBLIC_FEATURE_REWIND";
  let original: string | undefined;

  beforeEach(() => {
    original = process.env[ENV_KEY];
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env[ENV_KEY];
    } else {
      process.env[ENV_KEY] = original;
    }
  });

  it("rewind disabled (flag unset): stack is unchanged", () => {
    delete process.env[ENV_KEY];
    useSwipeStore.setState({ stack: [cardB] }); // simulate post-swipe state

    useSwipeStore.getState().rewind();

    expect(useSwipeStore.getState().stack).toHaveLength(1);
    expect(useSwipeStore.getState().stack[0]).toEqual(cardB);
  });

  it("rewind enabled: last swiped card is restored to top of stack", async () => {
    process.env[ENV_KEY] = "true";

    // Swipe cardA off
    useSwipeStore.setState({ stack: [cardA, cardB], isAnimating: false });
    const action = vi.fn().mockResolvedValue({ matched: false } satisfies SwipeResult);
    await useSwipeStore.getState().swipe("LIKE", action);

    // Stack is now [cardB]
    expect(useSwipeStore.getState().stack[0]).toEqual(cardB);

    // Rewind should restore cardA to the top
    useSwipeStore.getState().rewind();

    const { stack } = useSwipeStore.getState();
    expect(stack[0]).toEqual(cardA);
    expect(stack[1]).toEqual(cardB);
  });
});
