// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDrag } from "../use-drag";

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Creates a minimal synthetic PointerEvent-like object compatible with the
 * hook's bind handlers. jsdom doesn't fully implement setPointerCapture so
 * we provide a no-op stub.
 */
function makePointerEvent(
  x: number,
  pointerId = 1
): React.PointerEvent<HTMLDivElement> {
  return {
    clientX: x,
    pointerId,
    currentTarget: {
      setPointerCapture: vi.fn(),
      releasePointerCapture: vi.fn(),
    },
    preventDefault: vi.fn(),
  } as unknown as React.PointerEvent<HTMLDivElement>;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("useDrag — pointer tracking", () => {
  it("drag in progress: deltaX equals pointer displacement, isDragging is true", () => {
    const onRelease = vi.fn();
    const { result } = renderHook(() => useDrag({ onRelease }));

    act(() => {
      result.current.bind.onPointerDown(makePointerEvent(100));
    });

    act(() => {
      result.current.bind.onPointerMove(makePointerEvent(150));
    });

    expect(result.current.deltaX).toBe(50);
    expect(result.current.isDragging).toBe(true);
  });

  it("drag released: isDragging becomes false after pointerup", () => {
    const onRelease = vi.fn();
    const { result } = renderHook(() => useDrag({ onRelease }));

    act(() => {
      result.current.bind.onPointerDown(makePointerEvent(100));
    });
    act(() => {
      result.current.bind.onPointerMove(makePointerEvent(160));
    });
    act(() => {
      result.current.bind.onPointerUp(makePointerEvent(160));
    });

    expect(result.current.isDragging).toBe(false);
  });

  it("drag released: onRelease is called with the final deltaX", () => {
    const onRelease = vi.fn();
    const { result } = renderHook(() => useDrag({ onRelease }));

    act(() => {
      result.current.bind.onPointerDown(makePointerEvent(0));
    });
    act(() => {
      result.current.bind.onPointerMove(makePointerEvent(95));
    });
    act(() => {
      result.current.bind.onPointerUp(makePointerEvent(95));
    });

    expect(onRelease).toHaveBeenCalledOnce();
    expect(onRelease).toHaveBeenCalledWith(95);
  });
});

describe("useDrag — threshold detection", () => {
  it("below threshold: |deltaX| < 80 after release", () => {
    const onRelease = vi.fn();
    const { result } = renderHook(() => useDrag({ onRelease }));

    act(() => {
      result.current.bind.onPointerDown(makePointerEvent(0));
    });
    act(() => {
      result.current.bind.onPointerMove(makePointerEvent(60));
    });
    act(() => {
      result.current.bind.onPointerUp(makePointerEvent(60));
    });

    // onRelease receives 60 — caller decides threshold logic
    const calledWith = onRelease.mock.calls[0]?.[0] as number;
    expect(Math.abs(calledWith)).toBeLessThan(80);
  });

  it("above threshold: |deltaX| >= 80 after release", () => {
    const onRelease = vi.fn();
    const { result } = renderHook(() => useDrag({ onRelease }));

    act(() => {
      result.current.bind.onPointerDown(makePointerEvent(0));
    });
    act(() => {
      result.current.bind.onPointerMove(makePointerEvent(95));
    });
    act(() => {
      result.current.bind.onPointerUp(makePointerEvent(95));
    });

    const calledWith = onRelease.mock.calls[0]?.[0] as number;
    expect(Math.abs(calledWith)).toBeGreaterThanOrEqual(80);
  });

  it("onPointerCancel also triggers release — no path leaves isDragging=true", () => {
    const onRelease = vi.fn();
    const { result } = renderHook(() => useDrag({ onRelease }));

    act(() => {
      result.current.bind.onPointerDown(makePointerEvent(0));
    });
    act(() => {
      result.current.bind.onPointerMove(makePointerEvent(40));
    });
    act(() => {
      result.current.bind.onPointerCancel(makePointerEvent(40));
    });

    expect(result.current.isDragging).toBe(false);
    expect(onRelease).toHaveBeenCalledOnce();
    expect(onRelease).toHaveBeenCalledWith(40);
  });
});
