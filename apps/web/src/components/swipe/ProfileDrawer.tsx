"use client";

import { useState } from "react";
import { X, MapPin, Dumbbell, Target, Star, CalendarClock } from "lucide-react";
import type { DiscoveryCard } from "@/lib/swipe/types";
import { DISCIPLINE_LABELS as BASE_DISCIPLINE_LABELS } from "@/lib/disciplines";

const DISCIPLINE_LABELS: Record<string, string> = { ...BASE_DISCIPLINE_LABELS, GYM: "Gym" };

const GOAL_LABELS: Record<string, string> = {
  MUSCLE_GAIN: "Gain Muscle", FAT_LOSS: "Lose Weight", STRENGTH: "Strength",
  ENDURANCE: "Endurance", FLEXIBILITY: "Flexibility", GENERAL_FITNESS: "General Fitness",
  COMPETE: "Compete",
};

const EXP_LABELS: Record<string, string> = {
  BEGINNER: "Beginner", INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced", EXPERT: "Expert",
};

interface ProfileDrawerProps {
  card: DiscoveryCard;
  open: boolean;
  onClose: () => void;
}

export function ProfileDrawer({ card, open, onClose }: ProfileDrawerProps) {
  const [photoIndex, setPhotoIndex] = useState(0);

  if (!open) return null;

  const photo = card.photos[photoIndex];

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Dim */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Modal centrado */}
      <div
        className="relative w-full max-w-sm bg-background rounded-3xl overflow-hidden shadow-2xl"
        style={{ maxHeight: "85dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Photo gallery */}
        <div className="relative w-full aspect-[4/3] bg-zinc-200 flex-shrink-0">
          {photo ? (
            <img
              src={photo.url}
              alt={card.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-zinc-200" />
          )}

          {/* Photo dots */}
          {card.photos.length > 1 && (
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
              {card.photos.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPhotoIndex(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i === photoIndex ? "bg-white w-4" : "bg-white/50"
                  }`}
                />
              ))}
            </div>
          )}

          {/* Prev / Next tap zones */}
          {card.photos.length > 1 && (
            <>
              <button
                type="button"
                className="absolute left-0 top-0 w-1/3 h-full"
                onClick={() => setPhotoIndex((i) => Math.max(0, i - 1))}
              />
              <button
                type="button"
                className="absolute right-0 top-0 w-1/3 h-full"
                onClick={() => setPhotoIndex((i) => Math.min(card.photos.length - 1, i + 1))}
              />
            </>
          )}

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 bg-black/40 text-white rounded-full flex items-center justify-center hover:bg-black/60 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content — scrollable */}
        <div className="overflow-y-auto p-5 space-y-4" style={{ maxHeight: "40dvh" }}>
          {/* Name + location */}
          <div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-2xl font-bold">{card.name}</h2>
              {card.experienceLevel && (
                <span className="text-xs font-medium text-brand-500 bg-brand-50 px-2 py-0.5 rounded-full">
                  {EXP_LABELS[card.experienceLevel] ?? card.experienceLevel}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
              {card.city && (
                <span className="flex items-center gap-1">
                  <MapPin size={13} /> {card.city}
                </span>
              )}
              {card.gymName && (
                <span className="flex items-center gap-1">
                  <Dumbbell size={13} /> {card.gymName}
                </span>
              )}
            </div>
          </div>

          {/* Schedule compatibility */}
          {card.scheduleCompatible && (
            <div className="flex items-center gap-2 text-sm bg-emerald-50 text-emerald-700 rounded-xl px-3 py-2">
              <CalendarClock size={15} />
              <span>Trains at compatible times</span>
            </div>
          )}

          {/* Disciplines */}
          {card.disciplines.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                <Star size={11} /> Disciplines
              </p>
              <div className="flex flex-wrap gap-2">
                {card.disciplines.map((d) => (
                  <span key={d} className="text-xs px-3 py-1 bg-zinc-100 text-zinc-700 rounded-full font-medium">
                    {DISCIPLINE_LABELS[d] ?? d}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Goals */}
          {card.fitnessGoals.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                <Target size={11} /> Goals
              </p>
              <div className="flex flex-wrap gap-2">
                {card.fitnessGoals.map((g) => (
                  <span key={g} className="text-xs px-3 py-1 bg-brand-50 text-brand-600 rounded-full font-medium">
                    {GOAL_LABELS[g] ?? g}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
