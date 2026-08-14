"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { saveFitnessProfileAction } from "@/lib/auth/actions";
import type { Discipline, FitnessGoal, ExperienceLevel } from "@prisma/client";
import { DISCIPLINE_VALUES, DISCIPLINE_LABELS } from "@/lib/disciplines";

// ── Constants ─────────────────────────────────────────────────────────────

const DISCIPLINES = DISCIPLINE_VALUES.map((value) => ({ value, label: DISCIPLINE_LABELS[value] }));

const FITNESS_GOALS: { value: FitnessGoal; label: string }[] = [
  { value: "MUSCLE_GAIN", label: "Muscle Gain" },
  { value: "FAT_LOSS", label: "Fat Loss" },
  { value: "STRENGTH", label: "Strength" },
  { value: "ENDURANCE", label: "Endurance" },
  { value: "FLEXIBILITY", label: "Flexibility" },
  { value: "GENERAL_FITNESS", label: "General Fitness" },
  { value: "SPORTS_PERFORMANCE", label: "Sports Performance" },
];

const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string }[] = [
  { value: "BEGINNER", label: "Beginner" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED", label: "Advanced" },
  { value: "EXPERT", label: "Expert" },
];

// ── Helpers ───────────────────────────────────────────────────────────────

function toggle<T>(item: T, list: T[]): T[] {
  return list.includes(item) ? list.filter((i) => i !== item) : [...list, item];
}

// ── Page component ─────────────────────────────────────────────────────────

/**
 * Onboarding step 4 — fitness profile.
 * Client component: multi-select pills require local state.
 * Gated by onboardingVersion >= 2 in onboarding.ts;
 * page exists and works independently of the gate.
 */
export default function FitnessPage() {
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [goals, setGoals] = useState<FitnessGoal[]>([]);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | null>(null);
  const [weeklyFrequency, setWeeklyFrequency] = useState(3);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    disciplines.length > 0 && goals.length > 0 && experienceLevel !== null;

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    await saveFitnessProfileAction({
      disciplines,
      fitnessGoals: goals,
      experienceLevel,
      weeklyFrequency,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/onboarding/photo"
        aria-label="Back"
        className="self-start text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={20} aria-hidden="true" />
      </Link>

      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-bold">Your fitness profile</h1>
        <p className="text-sm text-gray-500">
          Tell us what you train and what you&apos;re after.
        </p>
      </div>

      {/* Disciplines */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-gray-700">
          What do you practice? <span className="text-gray-400">(pick at least 1)</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {DISCIPLINES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setDisciplines((d) => toggle(value, d))}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                disciplines.includes(value)
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white text-gray-700 border-gray-300 hover:border-brand-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Fitness Goals */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-gray-700">
          Your goals <span className="text-gray-400">(pick at least 1)</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {FITNESS_GOALS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setGoals((g) => toggle(value, g))}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                goals.includes(value)
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white text-gray-700 border-gray-300 hover:border-brand-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Experience Level */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-gray-700">Experience level</p>
        <div className="flex flex-wrap gap-2">
          {EXPERIENCE_LEVELS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setExperienceLevel(value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                experienceLevel === value
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white text-gray-700 border-gray-300 hover:border-brand-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Weekly Frequency Stepper */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-gray-700">
          Days per week
        </p>
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Decrease frequency"
            onClick={() => setWeeklyFrequency((f) => Math.max(1, f - 1))}
            className="w-9 h-9 rounded-full border border-gray-300 text-xl font-bold flex items-center justify-center leading-none hover:border-brand-400 transition-colors"
          >
            −
          </button>
          <span className="w-6 text-center text-lg font-semibold">
            {weeklyFrequency}
          </span>
          <button
            type="button"
            aria-label="Increase frequency"
            onClick={() => setWeeklyFrequency((f) => Math.min(7, f + 1))}
            className="w-9 h-9 rounded-full border border-gray-300 text-xl font-bold flex items-center justify-center leading-none hover:border-brand-400 transition-colors"
          >
            +
          </button>
        </div>
      </div>

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "Saving…" : "Continue"}
      </button>
    </div>
  );
}
