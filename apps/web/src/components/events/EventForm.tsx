"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createEventAction, updateEventAction } from "@/lib/events/actions";
import { EVENT_TYPE_LABELS } from "@/lib/events/labels";
import { DISCIPLINE_LABELS, DISCIPLINE_VALUES } from "@/lib/disciplines";
import type { Discipline, EventType } from "@prisma/client";

// ── Labels ────────────────────────────────────────────────────────────────

const TYPE_OPTIONS: EventType[] = [
  "CHALLENGE",
  "CLINIC",
  "COMPETITION",
  "FUNDRAISER",
  "MEETUP",
  "OPEN_MAT",
  "RETREAT",
  "SEMINAR",
  "SOCIAL",
  "TOURNAMENT",
  "WORKSHOP",
];

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

// ── Props ─────────────────────────────────────────────────────────────────

export interface EventFormInitial {
  id: string;
  title: string;
  type: EventType;
  startsAt: Date;
  endsAt: Date | null;
  description: string | null;
  location: string | null;
  gymId: string | null;
  capacity: number | null;
  price: number;
  disciplines: Discipline[];
}

interface EventFormProps {
  mode: "create" | "edit";
  initial?: EventFormInitial;
  userGymId: string | null;
  userDisciplines?: Discipline[];
}

// ── Component ─────────────────────────────────────────────────────────────

export function EventForm({ mode, initial, userGymId, userDisciplines = [] }: EventFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(initial?.title ?? "");
  const [type, setType] = useState<EventType>(initial?.type ?? "OPEN_MAT");
  const [startsAt, setStartsAt] = useState(
    initial ? toLocalInputValue(initial.startsAt) : ""
  );
  const [endsAt, setEndsAt] = useState(
    initial?.endsAt ? toLocalInputValue(initial.endsAt) : ""
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [atGym, setAtGym] = useState<boolean>(
    initial ? initial.gymId != null : userGymId != null
  );
  const [location, setLocation] = useState(initial?.location ?? "");
  const [capacity, setCapacity] = useState(initial?.capacity != null ? String(initial.capacity) : "");
  const [price, setPrice] = useState(String(initial?.price ?? 0));
  const [disciplines, setDisciplines] = useState<Discipline[]>(
    initial?.disciplines ?? userDisciplines
  );

  const [isPending, setIsPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const isStartsAtInPast = startsAt !== "" && new Date(startsAt).getTime() < Date.now();

  function toggleDiscipline(d: Discipline) {
    setDisciplines((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  }

  async function handleSubmit() {
    setErrorMsg("");
    setIsPending(true);

    const input = {
      title,
      type,
      startsAt,
      ...(endsAt ? { endsAt } : {}),
      description: description || null,
      ...(atGym && userGymId ? { gymId: userGymId } : { gymId: null }),
      location: atGym ? null : location,
      ...(capacity ? { capacity: Number(capacity) } : {}),
      price: Number(price),
      disciplines,
    };

    const result =
      mode === "edit" && initial
        ? await updateEventAction(initial.id, input)
        : await createEventAction(input);

    if ("error" in result) {
      setIsPending(false);
      setErrorMsg(result.error);
      return;
    }

    const eventId = "eventId" in result ? result.eventId : initial!.id;
    router.push(`/events/${eventId}`);
  }

  return (
    <div className="space-y-6">
      {/* ── Title ───────────────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-semibold mb-1 text-foreground" htmlFor="event-title">
          Title
        </label>
        <input
          id="event-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          placeholder="Sunday open mat"
          className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* ── Type ────────────────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-semibold mb-1 text-foreground" htmlFor="event-type">
          Type
        </label>
        <select
          id="event-type"
          value={type}
          onChange={(e) => setType(e.target.value as EventType)}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {EVENT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      {/* ── When ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-semibold mb-1 text-foreground" htmlFor="event-startsAt">
            Starts
          </label>
          <input
            id="event-startsAt"
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {isStartsAtInPast && (
            <p className="text-xs text-amber-600 mt-1">
              This event is in the past and won't appear in upcoming events.
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1 text-foreground" htmlFor="event-endsAt">
            Ends (optional)
          </label>
          <input
            id="event-endsAt"
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* ── Description ─────────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-semibold mb-1 text-foreground" htmlFor="event-description">
          Description
        </label>
        <textarea
          id="event-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={1000}
          rows={3}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
        <p className="text-xs text-muted-foreground mt-1">Max 1000 characters</p>
      </div>

      {/* ── Venue ───────────────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-semibold mb-1 text-foreground">Venue</label>
        {userGymId && (
          <label className="flex items-center gap-2 mb-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={atGym}
              onChange={(e) => setAtGym(e.target.checked)}
            />
            At my gym
          </label>
        )}
        {atGym ? (
          <p className="text-sm text-muted-foreground border border-border rounded-lg px-3 py-2">
            Your gym
          </p>
        ) : (
          <div>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={140}
              placeholder="Address or location name"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Location is required for events without a gym
            </p>
          </div>
        )}
      </div>

      {/* ── Interests ──────────────────────────────────────────────────── */}
      <div>
        <span className="block text-sm font-semibold mb-1 text-foreground">Interests</span>
        <p className="text-xs text-muted-foreground mb-2">
          Optional — helps people find your event when they filter by interest.
        </p>
        <div className="flex flex-wrap gap-2">
          {DISCIPLINE_VALUES.map((d) => {
            const selected = disciplines.includes(d);
            return (
              <button
                key={d}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleDiscipline(d)}
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

      {/* ── Capacity & price ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-semibold mb-1 text-foreground" htmlFor="event-capacity">
            Capacity (optional)
          </label>
          <input
            id="event-capacity"
            type="number"
            min={1}
            max={1000}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            placeholder="No limit"
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1 text-foreground" htmlFor="event-price">
            Price
          </label>
          <input
            id="event-price"
            type="number"
            min={0}
            max={1000000}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0"
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* ── Feedback ────────────────────────────────────────────────────── */}
      {errorMsg && (
        <p className="text-sm text-destructive font-medium" role="alert">
          {errorMsg}
        </p>
      )}

      {/* ── Submit ──────────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={isPending}
        className="w-full py-3 bg-brand-500 text-white rounded-full font-semibold disabled:opacity-60"
      >
        {isPending ? "Saving..." : mode === "edit" ? "Save changes" : "Create event"}
      </button>
    </div>
  );
}