"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSwipeStore } from "@/stores/swipe.store";
import { getConversationIdAction } from "@/lib/chat/actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function MatchModal() {
  const currentMatch = useSwipeStore((s) => s.currentMatch);
  const clearMatch = useSwipeStore((s) => s.clearMatch);
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  const isOpen = !!currentMatch;
  const matchedName = currentMatch?.matchedUser?.name ?? "your match";

  async function handleSendMessage() {
    if (!currentMatch?.matchId) return;
    setIsNavigating(true);
    try {
      const conversationId = await getConversationIdAction(currentMatch.matchId);
      if (conversationId) {
        clearMatch();
        router.push(`/matches/${conversationId}`);
      }
    } finally {
      setIsNavigating(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) clearMatch(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>It&apos;s a Match!</DialogTitle>
        </DialogHeader>
        <p className="text-center text-lg font-medium">{matchedName}</p>
        <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4">
          <button
            type="button"
            onClick={handleSendMessage}
            disabled={isNavigating}
            className="px-6 py-2 rounded-full bg-brand-600 text-white font-semibold disabled:opacity-50"
          >
            {isNavigating ? "Opening chat…" : "Send message"}
          </button>
          <button
            type="button"
            aria-label="Close"
            onClick={clearMatch}
            className="px-6 py-2 rounded-full border border-brand-600 text-brand-600 font-semibold"
          >
            Keep swiping
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
