"use client";

import { useState, useRef } from "react";
import { GymSearch } from "@/components/gym/GymSearch";
import { updateProfileAction, updateScheduleSlotsAction } from "@/lib/profile/actions";
import type { ScheduleSlotInput, ProfileUser } from "@gymatch/core";
import { DISCIPLINE_LABELS, DISCIPLINE_VALUES as DISCIPLINE_OPTIONS } from "@gymatch/core";
import type { DayOfWeek, Discipline, ExperienceLevel, FitnessGoal } from "@prisma/client";

// ── Labels ────────────────────────────────────────────────────────────────

const ACTIVITY_OPTIONS: string[] = [
  "Weightlifting",
  "CrossFit",
  "Yoga",
  "Pilates",
  "Running",
  "Cycling",
  "Swimming",
  "Boxing",
  "Martial Arts",
  "Calisthenics",
  "HIIT",
  "Functional",
  "BJJ",
  "Judo",
  "Karate",
  "Kickboxing",
  "MMA",
  "Muay Thai",
  "Dance",
  "Zumba",
  "Basketball",
  "Soccer",
  "Tennis",
  "Padel",
  "Climbing",
  "Rowing",
  "Spinning",
];

const CUSTOM_ACTIVITY = "__custom__";

const FITNESS_GOAL_OPTIONS: FitnessGoal[] = [
  "MUSCLE_GAIN",
  "FAT_LOSS",
  "STRENGTH",
  "ENDURANCE",
  "FLEXIBILITY",
  "GENERAL_FITNESS",
  "SPORTS_PERFORMANCE",
];

const FITNESS_GOAL_LABELS: Record<FitnessGoal, string> = {
  MUSCLE_GAIN: "Muscle Gain",
  FAT_LOSS: "Fat Loss",
  STRENGTH: "Strength",
  ENDURANCE: "Endurance",
  FLEXIBILITY: "Flexibility",
  GENERAL_FITNESS: "General Fitness",
  SPORTS_PERFORMANCE: "Sports Performance",
};

const EXPERIENCE_LEVEL_OPTIONS: ExperienceLevel[] = [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
  "EXPERT",
];

const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
  EXPERT: "Expert",
};

const DAY_OPTIONS: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
  SUNDAY: "Sun",
};

// ── Helpers ───────────────────────────────────────────────────────────────

function toggleItem<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];
}

// ── Types ─────────────────────────────────────────────────────────────────

interface GymValue {
  id: string;
  name: string;
  address?: string;
}

interface ProfileEditFormProps {
  profile: ProfileUser;
}

interface SlotDraft {
  key: string;
  day: DayOfWeek;
  activity: string;
  startTime: string;
  endTime: string;
  atGym: boolean;
}

let nextSlotKey = 0;
function newSlotKey(): string {
  return `slot-${nextSlotKey++}`;
}

// ── Component ─────────────────────────────────────────────────────────────

export function ProfileEditForm({ profile }: ProfileEditFormProps) {
  // bio is uncontrolled — read via ref on submit
  const bioRef = useRef<HTMLTextAreaElement>(null);

  // All other fields are controlled
  const [gym, setGym] = useState<GymValue | null>(
    profile.gym
      ? {
          id: profile.gym.id,
          name: profile.gym.name,
          // exactOptionalPropertyTypes: only include address when non-null
          ...(profile.gym.address ? { address: profile.gym.address } : {}),
        }
      : null
  );
  const [disciplines, setDisciplines] = useState<Discipline[]>(profile.disciplines);
  const [fitnessGoals, setFitnessGoals] = useState<FitnessGoal[]>(profile.fitnessGoals);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | null>(
    profile.experienceLevel
  );
  const [weeklyFrequency, setWeeklyFrequency] = useState<number>(
    profile.weeklyFrequency ?? 3
  );
  const [minAge, setMinAge] = useState<number>(profile.minAge);
  const [maxAge, setMaxAge] = useState<number>(profile.maxAge);
  const [slotDrafts, setSlotDrafts] = useState<SlotDraft[]>(
    profile.scheduleSlots.map((slot) => ({
      key: newSlotKey(),
      day: slot.day,
      activity: slot.activity,
      startTime: slot.startTime,
      endTime: slot.endTime ?? "",
      atGym: slot.gymId != null,
    }))
  );

  // Submit state
  const [isPending, setIsPending] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // ── Handlers ────────────────────────────────────────────────────────────

  async function handleSubmit() {
    setSuccessMsg("");
    setErrorMsg("");
    setIsPending(true);

    const result = await updateProfileAction({
      bio: bioRef.current?.value ?? "",
      disciplines,
      fitnessGoals,
      ...(experienceLevel !== null && { experienceLevel }),
      weeklyFrequency,
      minAge,
      maxAge,
    });

    if ("error" in result) {
      setIsPending(false);
      setErrorMsg(result.error);
      return;
    }

    const slots: ScheduleSlotInput[] = slotDrafts.map((slot) => ({
      day: slot.day,
      startTime: slot.startTime,
      endTime: slot.endTime || null,
      activity: slot.activity,
      gymId: slot.atGym ? profile.gymId : null,
    }));

    const scheduleResult = await updateScheduleSlotsAction({ slots });

    setIsPending(false);

    if ("error" in scheduleResult) {
      setErrorMsg(scheduleResult.error);
    } else {
      setSuccessMsg("Profile updated!");
      setTimeout(() => setSuccessMsg(""), 2000);
    }
  }

  function addSlot(day: DayOfWeek) {
    setSlotDrafts((prev) => [
      ...prev,
      {
        key: newSlotKey(),
        day,
        activity: "",
        startTime: "18:00",
        endTime: "",
        atGym: profile.gymId != null,
      },
    ]);
  }

  function removeSlot(key: string) {
    setSlotDrafts((prev) => prev.filter((slot) => slot.key !== key));
  }

  function updateSlot(key: string, patch: Partial<SlotDraft>) {
    setSlotDrafts((prev) => prev.map((slot) => (slot.key === key ? { ...slot, ...patch } : slot)));
  }

  function handleFrequencyChange(delta: number) {
    setWeeklyFrequency((prev) => Math.min(7, Math.max(1, prev + delta)));
  }

  function handleMinAgeChange(delta: number) {
    setMinAge((prev) => Math.min(98, Math.max(18, prev + delta)));
  }

  function handleMaxAgeChange(delta: number) {
    setMaxAge((prev) => Math.min(99, Math.max(19, prev + delta)));
  }

  const ageRangeError = minAge >= maxAge ? "Age min must be less than Age max" : null;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Bio ─────────────────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-semibold mb-1 text-foreground" htmlFor="bio">
          Bio
        </label>
        <textarea
          id="bio"
          ref={bioRef}
          defaultValue={profile.bio ?? ""}
          maxLength={200}
          rows={3}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
        <p className="text-xs text-muted-foreground mt-1">Max 200 characters</p>
      </div>

      {/* ── Gym ─────────────────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-semibold mb-1 text-foreground">Gym</label>
        <GymSearch value={gym} onChange={setGym} />
      </div>

      {/* ── Disciplines ─────────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-semibold mb-2 text-foreground">
          Disciplines
        </label>
        <div className="flex flex-wrap gap-2">
          {DISCIPLINE_OPTIONS.map((d) => {
            const selected = disciplines.includes(d);
            return (
              <button
                key={d}
                type="button"
                aria-pressed={selected}
                onClick={() => setDisciplines((prev) => toggleItem(prev, d))}
                className={
                  selected
                    ? "px-3 py-1 rounded-full text-sm font-medium bg-brand-500 text-white"
                    : "px-3 py-1 rounded-full text-sm font-medium border border-border text-foreground"
                }
              >
                {DISCIPLINE_LABELS[d]}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Fitness Goals ────────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-semibold mb-2 text-foreground">
          Fitness Goals
        </label>
        <div className="flex flex-wrap gap-2">
          {FITNESS_GOAL_OPTIONS.map((g) => {
            const selected = fitnessGoals.includes(g);
            return (
              <button
                key={g}
                type="button"
                aria-pressed={selected}
                onClick={() => setFitnessGoals((prev) => toggleItem(prev, g))}
                className={
                  selected
                    ? "px-3 py-1 rounded-full text-sm font-medium bg-brand-500 text-white"
                    : "px-3 py-1 rounded-full text-sm font-medium border border-border text-foreground"
                }
              >
                {FITNESS_GOAL_LABELS[g]}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Experience Level ─────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-semibold mb-2 text-foreground">
          Experience Level
        </label>
        <div className="flex flex-wrap gap-2">
          {EXPERIENCE_LEVEL_OPTIONS.map((lvl) => {
            const selected = experienceLevel === lvl;
            return (
              <button
                key={lvl}
                type="button"
                aria-pressed={selected}
                onClick={() => setExperienceLevel(lvl)}
                className={
                  selected
                    ? "px-3 py-1 rounded-full text-sm font-medium bg-brand-500 text-white"
                    : "px-3 py-1 rounded-full text-sm font-medium border border-border text-foreground"
                }
              >
                {EXPERIENCE_LEVEL_LABELS[lvl]}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Weekly Frequency ─────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-semibold mb-2 text-foreground">
          Weekly Frequency
        </label>
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="−"
            onClick={() => handleFrequencyChange(-1)}
            disabled={weeklyFrequency <= 1}
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-lg font-bold leading-none disabled:opacity-40"
          >
            −
          </button>
          <span className="text-lg font-bold w-4 text-center">{weeklyFrequency}</span>
          <button
            type="button"
            aria-label="+"
            onClick={() => handleFrequencyChange(1)}
            disabled={weeklyFrequency >= 7}
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-lg font-bold leading-none disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>

      {/* ── Age Range ────────────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-semibold mb-2 text-foreground">
          Age range
        </label>
        <div className="flex items-center gap-6">
          {/* Age min */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-muted-foreground">Age min</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Decrease minimum age"
                onClick={() => handleMinAgeChange(-1)}
                disabled={minAge <= 18}
                className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-lg font-bold leading-none disabled:opacity-40"
              >
                −
              </button>
              <span className="text-lg font-bold w-6 text-center">{minAge}</span>
              <button
                type="button"
                aria-label="Increase minimum age"
                onClick={() => handleMinAgeChange(1)}
                disabled={minAge >= 98}
                className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-lg font-bold leading-none disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>

          {/* Age max */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-muted-foreground">Age max</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Decrease maximum age"
                onClick={() => handleMaxAgeChange(-1)}
                disabled={maxAge <= 19}
                className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-lg font-bold leading-none disabled:opacity-40"
              >
                −
              </button>
              <span className="text-lg font-bold w-6 text-center">{maxAge}</span>
              <button
                type="button"
                aria-label="Increase maximum age"
                onClick={() => handleMaxAgeChange(1)}
                disabled={maxAge >= 99}
                className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-lg font-bold leading-none disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>
        </div>
        {ageRangeError && (
          <p className="text-xs text-destructive mt-1" role="alert">
            {ageRangeError}
          </p>
        )}
      </div>

      {/* ── Weekly training schedule ───────────────────────────────────── */}
      <div>
        <label className="block text-sm font-semibold mb-2 text-foreground">
          Weekly training schedule
        </label>
        <div className="space-y-3">
          {DAY_OPTIONS.map((day) => {
            const daySlots = slotDrafts.filter((slot) => slot.day === day);
            return (
              <div key={day}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">
                    {DAY_LABELS[day]}
                  </span>
                  <button
                    type="button"
                    aria-label={`Add slot ${DAY_LABELS[day]}`}
                    onClick={() => addSlot(day)}
                    className="text-xs font-medium text-brand-500 hover:underline"
                  >
                    + Add slot
                  </button>
                </div>
                <div className="space-y-2">
                  {daySlots.map((slot) => {
                    const isCustomActivity = !ACTIVITY_OPTIONS.includes(slot.activity);
                    return (
                      <div key={slot.key} className="flex items-center gap-2 flex-wrap">
                        <select
                          aria-label={`Activity ${DAY_LABELS[day]}`}
                          value={isCustomActivity ? CUSTOM_ACTIVITY : slot.activity}
                          onChange={(e) =>
                            e.target.value === CUSTOM_ACTIVITY
                              ? updateSlot(slot.key, { activity: "" })
                              : updateSlot(slot.key, { activity: e.target.value })
                          }
                          className="flex-1 min-w-24 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                          {ACTIVITY_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                          <option value={CUSTOM_ACTIVITY}>Other</option>
                        </select>
                        {isCustomActivity && (
                          <input
                            type="text"
                            aria-label={`Custom activity ${DAY_LABELS[day]}`}
                            value={slot.activity}
                            onChange={(e) => updateSlot(slot.key, { activity: e.target.value })}
                            placeholder="BJJ"
                            maxLength={40}
                            className="flex-1 min-w-24 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                        )}
                        <input
                          type="time"
                          aria-label={`Start time ${DAY_LABELS[day]}`}
                          value={slot.startTime}
                          onChange={(e) => updateSlot(slot.key, { startTime: e.target.value })}
                          className="border border-border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                        <input
                          type="time"
                          aria-label={`End time ${DAY_LABELS[day]}`}
                          value={slot.endTime}
                          onChange={(e) => updateSlot(slot.key, { endTime: e.target.value })}
                          className="border border-border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                        <label className="flex items-center gap-1 text-xs text-muted-foreground">
                          <input
                            type="checkbox"
                            aria-label={`At my gym ${DAY_LABELS[day]}`}
                            checked={slot.atGym}
                            onChange={(e) => updateSlot(slot.key, { atGym: e.target.checked })}
                          />
                          At my gym
                        </label>
                        <button
                          type="button"
                          aria-label="Remove slot"
                          onClick={() => removeSlot(slot.key)}
                          className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-sm leading-none text-muted-foreground hover:text-destructive"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Feedback messages ─────────────────────────────────────────────── */}
      {successMsg && (
        <p className="text-sm text-green-600 font-medium" role="status">
          {successMsg}
        </p>
      )}
      {errorMsg && (
        <p className="text-sm text-destructive font-medium" role="alert">
          {errorMsg}
        </p>
      )}

      {/* ── Submit ────────────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={isPending}
        className="w-full py-3 bg-brand-500 text-white rounded-full font-semibold disabled:opacity-60"
      >
        {isPending ? "Saving..." : "Save profile"}
      </button>
    </div>
  );
}
