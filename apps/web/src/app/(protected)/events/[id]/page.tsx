import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import { getUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/auth/admin";
import { getEventById } from "@/lib/events/queries";
import { formatEventDate } from "@/lib/events/format";
import { EVENT_TYPE_LABELS } from "@/lib/events/labels";
import { RsvpButton } from "@/components/events/RsvpButton";
import { DeleteEventButton } from "@/components/events/DeleteEventButton";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EventDetailPage({ params }: Props) {
  const { id } = await params;

  const user = await getUser();
  if (!user) redirect("/login");

  const dbUser = await prismaAdmin.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true },
  });
  if (!dbUser) redirect("/login");

  const event = await getEventById(id);
  if (!event) notFound();

  const isCreator = event.creatorId === dbUser.id;
  const isAttending = event.rsvps.some((rsvp) => rsvp.userId === dbUser.id);
  const isPast = event.startsAt.getTime() < Date.now();

  return (
    <div className="flex flex-col min-h-full px-6 py-8 max-w-sm mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/events"
          className="p-2 rounded-full hover:bg-muted transition-colors"
          aria-label="Back to events"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">{event.title}</h1>
      </div>

      {/* Type badge + time */}
      <div className="flex items-center gap-2 mb-4">
        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-muted text-muted-foreground">
          {EVENT_TYPE_LABELS[event.type]}
        </span>
      </div>

      <div className="space-y-5">
        {/* When */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            When
          </h2>
          <p className="text-sm text-foreground mt-1">{formatEventDate(event.startsAt)}</p>
          {event.endsAt && (
            <p className="text-sm text-muted-foreground">
              until {formatEventDate(event.endsAt)}
            </p>
          )}
        </div>

        {/* Where */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Where
          </h2>
          <div className="flex items-center gap-1 text-sm text-foreground mt-1">
            <MapPin size={14} className="text-muted-foreground" aria-hidden="true" />
            <span>{event.gym ? event.gym.name : event.location}</span>
          </div>
        </div>

        {/* Description */}
        {event.description && (
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Details
            </h2>
            <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">{event.description}</p>
          </div>
        )}

        {/* Attendance */}
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {event.rsvps.length}
            {event.capacity ? ` / ${event.capacity}` : ""} attending
          </h2>
          {event.price > 0 && <span className="text-sm font-semibold">${event.price}</span>}
        </div>

        {/* RSVP */}
        {!isCreator && <RsvpButton eventId={event.id} initiallyAttending={isAttending} />}

        {/* Creator */}
        <div className="border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">Created by</p>
          <p className="text-sm font-medium mt-0.5">
            {event.creator.name}
            {event.creator.username ? ` @${event.creator.username}` : ""}
          </p>
        </div>

        {/* Attendee list */}
        {event.rsvps.length > 0 && (
          <div className="border-t border-border pt-4">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Attendees
            </h2>
            <ul className="space-y-1.5">
              {event.rsvps.map((rsvp) => (
                <li key={rsvp.id} className="text-sm">
                  {rsvp.user.name}
                  {rsvp.user.city ? ` · ${rsvp.user.city}` : ""}
                  {rsvp.user.gym ? ` · ${rsvp.user.gym.name}` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Creator controls */}
        {isCreator && (
          <div className="space-y-3 border-t border-border pt-4">
            {!isPast && (
              <Link
                href={`/events/${event.id}/edit`}
                className="block w-full py-3 border border-brand-500 text-brand-600 rounded-full font-semibold text-center"
              >
                Edit event
              </Link>
            )}
            <DeleteEventButton eventId={event.id} />
          </div>
        )}
      </div>
    </div>
  );
}