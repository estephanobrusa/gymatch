import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import type { Discipline, EventType } from "@prisma/client";
import {
  getCurrentUserId,
  getCurrentUserProfileFilter,
  getFilteredEvents,
  getMyEvents,
} from "@/lib/events/queries";
import { formatEventDate } from "@/lib/events/format";
import { EVENT_TYPE_LABELS } from "@/lib/events/labels";
import { DISCIPLINE_LABELS, DISCIPLINE_VALUES } from "@/lib/disciplines";
import type { EventWithRelations } from "@/lib/events/types";

// ── Constants ─────────────────────────────────────────────────────────────

const TYPE_VALUES: EventType[] = [
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

// ── Parsing helpers ───────────────────────────────────────────────────────

function isDiscipline(value: string): value is Discipline {
  return (DISCIPLINE_VALUES as string[]).includes(value);
}

function parseDisciplinesParam(value: string | string[] | undefined): Discipline[] {
  if (value === undefined) return [];
  const raw = Array.isArray(value) ? value : [value];
  return Array.from(new Set(raw.filter(isDiscipline)));
}

function parseTypeParam(value: string | undefined): EventType | undefined {
  if (value === undefined) return undefined;
  return (TYPE_VALUES as string[]).includes(value) ? (value as EventType) : undefined;
}

// ── Link building ─────────────────────────────────────────────────────────

function buildQuery(state: {
  near?: string | undefined;
  disciplines: Discipline[];
  type?: EventType | undefined;
}): string {
  const search = new URLSearchParams();
  if (state.near) search.set("near", state.near);
  for (const d of state.disciplines) search.append("discipline", d);
  if (state.type) search.set("type", state.type);
  const qs = search.toString();
  return qs ? `/events?${qs}` : "/events";
}

// ── Components ────────────────────────────────────────────────────────────

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
        active
          ? "bg-brand-50 text-brand-500"
          : "border border-border text-foreground hover:border-brand-500"
      }`}
    >
      {children}
    </Link>
  );
}

function EventCard({
  event,
  showOwnership,
  showStatus,
}: {
  event: EventWithRelations;
  showOwnership: boolean;
  showStatus: boolean;
}) {
  const isPast = event.startsAt.getTime() < Date.now();

  return (
    <li key={event.id}>
      <Link
        href={`/events/${event.id}`}
        className="block border border-border rounded-xl p-4 hover:border-brand-500 transition-colors"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold">{event.title}</h2>
            {showOwnership && (
              <span className="text-brand-500 text-xs font-semibold">
                You created this
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {showStatus && (
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  isPast
                    ? "bg-muted text-muted-foreground"
                    : "bg-brand-50 text-brand-500"
                }`}
              >
                {isPast ? "Past" : "Upcoming"}
              </span>
            )}
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-muted text-muted-foreground">
              {EVENT_TYPE_LABELS[event.type]}
            </span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {formatEventDate(event.startsAt)}
        </p>
        <p className="text-sm text-muted-foreground">
          {event.gym ? event.gym.name : event.location}
        </p>
        <p className="text-sm text-brand-600 font-medium mt-2">
          {event._count.rsvps} attending
        </p>
      </Link>
    </li>
  );
}

interface EventsPageProps {
  searchParams: Promise<{
    near?: string;
    discipline?: string | string[];
    type?: string;
  }>;
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const { near, discipline, type } = await searchParams;

  const nearMe = near === "1";
  const activeDisciplines = parseDisciplinesParam(discipline);
  const activeType = parseTypeParam(type);
  const nearParam = nearMe ? "1" : undefined;

  const currentUserId = await getCurrentUserId();
  const profileFilter = currentUserId ? await getCurrentUserProfileFilter() : null;
  const userDisciplines = profileFilter?.disciplines ?? [];

  const [myEvents, feed] = await Promise.all([
    currentUserId ? getMyEvents(currentUserId) : Promise.resolve([]),
    currentUserId
      ? getFilteredEvents({
          userId: currentUserId,
          nearMe,
          disciplines: activeDisciplines,
          types: activeType ? [activeType] : [],
        })
      : Promise.resolve({ events: [], nextCursor: null }),
  ]);

  const events = feed.events;
  const createdEventIds = new Set(myEvents.map((event) => event.id));

  const toggleNear = buildQuery({
    near: nearParam ? undefined : "1",
    disciplines: activeDisciplines,
    type: activeType,
  });
  const clearDisciplines = buildQuery({
    near: nearParam,
    disciplines: [],
    type: activeType,
  });
  const clearType = buildQuery({
    near: nearParam,
    disciplines: activeDisciplines,
  });
  const toggleDiscipline = (d: Discipline) =>
    buildQuery({
      near: nearParam,
      disciplines: activeDisciplines.includes(d)
        ? activeDisciplines.filter((x) => x !== d)
        : [...activeDisciplines, d],
      type: activeType,
    });
  const toggleType = (t: EventType) =>
    buildQuery({
      near: nearParam,
      disciplines: activeDisciplines,
      type: activeType === t ? undefined : t,
    });

  return (
    <div className="flex flex-col min-h-full px-6 py-8 max-w-sm mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Events</h1>
        <Link
          href="/events/new"
          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-brand-500 text-white text-sm font-semibold"
        >
          <CalendarPlus size={16} aria-hidden="true" />
          New
        </Link>
      </div>

      {myEvents.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Your events
          </h2>
          <ul className="space-y-4">
            {myEvents.map((event) => (
              <EventCard key={event.id} event={event} showOwnership={false} showStatus />
            ))}
          </ul>
        </section>
      )}

      {/* ── Filter bar ─────────────────────────────────────────────────── */}
      <section className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide w-16 shrink-0">
            Near me
          </span>
          <FilterChip href={toggleNear} active={nearMe}>
            Near me
          </FilterChip>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide w-16 shrink-0">
            Discipline
          </span>
          <FilterChip href={clearDisciplines} active={activeDisciplines.length === 0}>
            All
          </FilterChip>
          {userDisciplines.map((d) => (
            <FilterChip
              key={d}
              href={toggleDiscipline(d)}
              active={activeDisciplines.includes(d)}
            >
              {DISCIPLINE_LABELS[d]}
            </FilterChip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide w-16 shrink-0">
            Type
          </span>
          <FilterChip href={clearType} active={activeType === undefined}>
            All
          </FilterChip>
          {TYPE_VALUES.map((t) => (
            <FilterChip
              key={t}
              href={toggleType(t)}
              active={activeType === t}
            >
              {EVENT_TYPE_LABELS[t]}
            </FilterChip>
          ))}
        </div>
      </section>

      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground mt-8 text-center">
          No upcoming events yet. Create the first one!
        </p>
      ) : (
        <ul className="space-y-4">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              showOwnership={createdEventIds.has(event.id)}
              showStatus={false}
            />
          ))}
        </ul>
      )}
    </div>
  );
}