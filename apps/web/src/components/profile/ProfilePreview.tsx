"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import type { DiscoveryCard } from "@gymatch/core";
import { ProfileDrawer } from "@/components/swipe/ProfileDrawer";
import { DISCIPLINE_LABELS } from "@gymatch/core";
import type { Discipline } from "@prisma/client";

interface ProfilePreviewProps {
  card: DiscoveryCard;
}

export function ProfilePreview({ card }: ProfilePreviewProps) {
  const [previewOpen, setPreviewOpen] = useState(false);

  const photo = card.photos[0]?.url;

  return (
    <div className="w-full border border-border rounded-2xl overflow-hidden">
      {/* Banner */}
      <div className="relative w-full aspect-[4/3] bg-zinc-200">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={card.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-muted-foreground">
            {card.name?.[0]?.toUpperCase() ?? "?"}
          </div>
        )}
        <span className="absolute top-3 left-3 px-2 py-0.5 text-xs font-medium text-brand-700 bg-brand-50 rounded-full">
          Discover preview
        </span>
      </div>

      {/* Facts */}
      <div className="p-4 space-y-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-bold text-lg truncate">{card.name}</p>
          {card.experienceLevel && (
            <span className="text-xs font-medium text-brand-500 bg-brand-50 px-2 py-0.5 rounded-full shrink-0">
              {card.experienceLevel}
            </span>
          )}
        </div>
        {(card.city || card.gymName) && (
          <p className="text-sm text-muted-foreground truncate">
            {[card.city, card.gymName].filter(Boolean).join(" · ")}
          </p>
        )}
        {card.disciplines.length > 0 && (
          <p className="text-xs text-muted-foreground truncate">
            {card.disciplines.map((d) => DISCIPLINE_LABELS[d as Discipline] ?? d).join(" · ")}
          </p>
        )}
      </div>

      {/* Full preview toggle */}
      <div className="px-4 pb-4">
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="w-full py-2 rounded-full border border-border text-sm font-semibold text-foreground hover:border-brand-500 hover:text-brand-500 transition-colors flex items-center justify-center gap-2"
        >
          <Eye size={15} />
          How others see you
        </button>
      </div>

      <ProfileDrawer card={card} open={previewOpen} onClose={() => setPreviewOpen(false)} />
    </div>
  );
}