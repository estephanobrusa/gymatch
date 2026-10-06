import { useSyncExternalStore } from "react";

/**
 * In-app debug log — renders OAuth/diagnostic events directly on screen so
 * the flow can be inspected without hunting through Metro terminals.
 * Deliberately tiny and framework-free: a module singleton with subscribers.
 */

export interface DebugEntry {
  at: string; // HH:MM:SS
  msg: string;
}

const MAX_ENTRIES = 40;
let entries: DebugEntry[] = [];
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

export function addLog(msg: string) {
  const entry: DebugEntry = { at: new Date().toLocaleTimeString(), msg };
  entries = [...entries.slice(-(MAX_ENTRIES - 1)), entry];
  console.log(msg); // keep Metro logs too, if anyone is watching
  notify();
}

export function getLogs(): DebugEntry[] {
  return entries;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** React hook: re-renders with the latest debug entries. */
export function useDebugLog(): DebugEntry[] {
  return useSyncExternalStore(subscribe, getLogs, getLogs);
}

export function clearLogs() {
  entries = [];
  notify();
}