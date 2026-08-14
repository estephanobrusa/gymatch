"use client";

import { useDiscoveryFeed } from "@/lib/swipe/hooks";
import { CardStack } from "./CardStack";
import { ActionButtons } from "./ActionButtons";
import { MatchModal } from "./MatchModal";

export function DiscoveryPage() {
  const { isPending, isError } = useDiscoveryFeed();

  return (
    <div className="flex flex-col h-full">
      {/* Brand header */}
      <header className="flex items-center justify-center px-4 py-3 flex-shrink-0">
        <span className="text-2xl font-bold tracking-tight text-brand-500">Gymatch</span>
      </header>

      {/* Card + buttons — centered as a unit */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-4 min-h-0 pb-2">
        {/* Card */}
        <div className="relative w-full max-w-sm" style={{ height: "min(520px, calc(100dvh - 220px))" }}>
          {isPending && (
            <div
              role="status"
              aria-label="Loading profiles"
              className="flex items-center justify-center w-full h-full"
            >
              <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {isError && (
            <div
              role="alert"
              className="flex items-center justify-center w-full h-full text-center text-red-600"
            >
              <p>Something went wrong loading profiles. Please try again.</p>
            </div>
          )}

          {!isPending && !isError && <CardStack />}
        </div>

        {/* Action buttons — immediately below the card */}
        {!isPending && !isError && <ActionButtons />}
      </div>

      <MatchModal />
    </div>
  );
}
