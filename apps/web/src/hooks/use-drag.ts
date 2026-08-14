import { useState, useCallback, useRef } from "react";
import type React from "react";

export interface DragState {
  deltaX: number;
  isDragging: boolean;
}

export interface UseDragOptions {
  onRelease: (deltaX: number) => void;
  threshold?: number;
}

export interface UseDragReturn extends DragState {
  bind: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    onPointerCancel: (e: React.PointerEvent) => void;
  };
}

export function useDrag({ onRelease }: UseDragOptions): UseDragReturn {
  const [state, setState] = useState<DragState>({ deltaX: 0, isDragging: false });
  const startXRef = useRef(0);
  const onReleaseRef = useRef(onRelease);
  onReleaseRef.current = onRelease;

  const release = useCallback((deltaX: number) => {
    setState({ deltaX: 0, isDragging: false });
    onReleaseRef.current(deltaX);
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    startXRef.current = e.clientX;
    setState({ deltaX: 0, isDragging: true });
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    setState((prev) => {
      if (!prev.isDragging) return prev;
      return { ...prev, deltaX: e.clientX - startXRef.current };
    });
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      setState((prev) => {
        if (!prev.isDragging) return prev;
        release(e.clientX - startXRef.current);
        return prev;
      });
    },
    [release]
  );

  const onPointerCancel = useCallback(
    (e: React.PointerEvent) => {
      setState((prev) => {
        if (!prev.isDragging) return prev;
        release(e.clientX - startXRef.current);
        return prev;
      });
    },
    [release]
  );

  return {
    deltaX: state.deltaX,
    isDragging: state.isDragging,
    bind: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
  };
}
