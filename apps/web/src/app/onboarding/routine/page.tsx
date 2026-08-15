"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { saveRoutineAction } from "@/lib/routine/actions";
import { TEMPLATES, type TemplateName, type RoutineTemplateMap } from "@gymatch/core";

// ── Constants ─────────────────────────────────────────────────────────────

const TEMPLATE_OPTIONS: { value: TemplateName; label: string; description: string }[] = [
  {
    value: "PUSH_PULL_LEGS",
    label: "Push / Pull / Legs",
    description: "Classic 6-day split: push, pull, legs alternating",
  },
  {
    value: "BRO_SPLIT",
    label: "Bro Split",
    description: "One muscle group per day for maximum isolation",
  },
  {
    value: "FULL_BODY_3",
    label: "Full Body 3x",
    description: "3 full-body sessions with rest days in between",
  },
  {
    value: "UPPER_LOWER",
    label: "Upper / Lower",
    description: "Alternating upper and lower body days",
  },
  {
    value: "ARNOLD_SPLIT",
    label: "Arnold Split",
    description: "Chest + back, shoulders + arms, legs — 6-day split",
  },
];

// ── Page component ─────────────────────────────────────────────────────────

/**
 * Onboarding step 5 — routine.
 * Client component: template cards require local state.
 * Gated by onboardingVersion >= 2 in onboarding.ts.
 */
export default function RoutinePage() {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateName | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = true;

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);

    // Save routine from template if one was selected
    if (selectedTemplate) {
      const routine = TEMPLATES[selectedTemplate] as RoutineTemplateMap;
      await saveRoutineAction(routine);
    }

    window.location.assign("/");
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/onboarding/fitness"
        aria-label="Back"
        className="self-start text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={20} aria-hidden="true" />
      </Link>

      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-bold">Your routine</h1>
        <p className="text-sm text-gray-500">
          Pick a routine template to get started — or skip and finish now.
        </p>
      </div>

      {/* Template cards */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-gray-700">
          Start with a routine template{" "}
          <span className="text-gray-400">(optional)</span>
        </p>
        <div className="flex flex-col gap-2">
          {TEMPLATE_OPTIONS.map(({ value, label, description }) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                setSelectedTemplate((t) => (t === value ? null : value))
              }
              className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                selectedTemplate === value
                  ? "bg-brand-50 border-brand-600 text-brand-800"
                  : "bg-white border-gray-200 text-gray-700 hover:border-brand-300"
              }`}
            >
              <p className="font-semibold text-sm">{label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "Saving…" : "Finish"}
      </button>
    </div>
  );
}
