"use client";

import { useState } from "react";
import type { DiscoveryCard, SwipeDirection } from "@/lib/swipe/types";
import { useDrag } from "@/hooks/use-drag";
import { ReportModal } from "@/components/moderation/ReportModal";
import { BlockConfirmDialog } from "@/components/moderation/BlockConfirmDialog";
import { ProfileDrawer } from "./ProfileDrawer";

const SWIPE_THRESHOLD = 80;
const TAP_THRESHOLD = 8; // px — movement under this is a tap, not a drag

export interface SwipeCardProps {
  card: DiscoveryCard;
  isTop: boolean;
  zIndex: number;
  onSwipe: (dir: SwipeDirection) => void;
  "aria-hidden"?: true;
}

export function SwipeCard({ card, isTop, zIndex, onSwipe, "aria-hidden": ariaHidden }: SwipeCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { bind, deltaX } = useDrag({
    onRelease: (dx) => {
      if (Math.abs(dx) >= SWIPE_THRESHOLD) {
        // Defer to next tick — avoids setState-during-render warning
        // (useDrag calls onRelease inside its own setState updater)
        setTimeout(() => onSwipe(dx > 0 ? "LIKE" : "PASS"), 0);
      } else if (isTop && Math.abs(dx) < TAP_THRESHOLD) {
        setTimeout(() => setDrawerOpen(true), 0);
      }
    },
  });

  const photo = card.photos[0];
  const bindProps = isTop ? bind : {};

  const tiltStyle = isTop && deltaX !== 0
    ? { transform: `translateX(${deltaX}px) rotate(${deltaX * 0.04}deg)` }
    : {};

  const stackClass =
    zIndex === 2 ? "scale-[0.96] translate-y-2" :
    zIndex === 1 ? "scale-[0.92] translate-y-4" : "";

  function handleBlocked() {
    onSwipe("PASS");
  }

  return (
    <>
      <article
        role="article"
        aria-label={`${card.name}, ${card.city ?? "unknown city"}`}
        aria-hidden={ariaHidden}
        style={{ zIndex, ...tiltStyle }}
        className={`absolute inset-0 rounded-2xl overflow-hidden shadow-xl touch-none select-none ${isTop ? "transition-transform duration-75" : `transition-transform duration-200 ${stackClass}`}`}
        {...bindProps}
      >
        {photo ? (
          <img
            src={photo.url}
            alt={card.name}
            className="w-full h-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-200 to-zinc-300 -z-10" />

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 via-black/30 to-transparent text-white">
          <p className="font-bold text-xl">{card.name}</p>
          {card.gymName && <p className="text-sm opacity-80 mt-0.5">🏋️ {card.gymName}</p>}
          {card.city && <p className="text-xs opacity-60 mt-0.5">📍 {card.city}</p>}
        </div>
      </article>

      {isTop && (
        <div className="absolute top-3 right-3 touch-auto" style={{ zIndex: zIndex + 1 }}>
          <button
            type="button"
            aria-label="More options"
            aria-expanded={menuOpen}
            onClick={(e) => { e.stopPropagation(); setMenuOpen((prev) => !prev); }}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 min-w-[110px] rounded-md border bg-background shadow-md py-1">
              <button
                type="button"
                className="w-full text-left px-4 py-2 text-sm hover:bg-accent transition-colors"
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setReportOpen(true); }}
              >
                Report
              </button>
              <button
                type="button"
                className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-accent transition-colors"
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setBlockOpen(true); }}
              >
                Block
              </button>
            </div>
          )}
        </div>
      )}

      <ProfileDrawer card={card} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <ReportModal targetUserId={card.id} open={reportOpen} onOpenChange={setReportOpen} />
      <BlockConfirmDialog
        targetUserId={card.id}
        targetUserName={card.name}
        open={blockOpen}
        onOpenChange={setBlockOpen}
        onBlocked={handleBlocked}
      />
    </>
  );
}
