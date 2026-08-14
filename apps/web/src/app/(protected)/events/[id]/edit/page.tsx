import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/auth/admin";
import { getEventById } from "@/lib/events/queries";
import { EventForm } from "@/components/events/EventForm";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditEventPage({ params }: Props) {
  const { id } = await params;

  const user = await getUser();
  if (!user) redirect("/login");

  const dbUser = await prismaAdmin.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true, gymId: true },
  });
  if (!dbUser) redirect("/login");

  const event = await getEventById(id);
  if (!event) notFound();

  // Only the creator can edit
  if (event.creatorId !== dbUser.id) notFound();

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/events/${event.id}`}
          className="p-2 rounded-full hover:bg-muted transition-colors"
          aria-label="Back to event"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">Edit Event</h1>
      </div>

      <EventForm
        mode="edit"
        initial={{
          id: event.id,
          title: event.title,
          type: event.type,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          description: event.description,
          location: event.location,
          gymId: event.gymId,
          capacity: event.capacity,
          price: event.price,
          disciplines: event.disciplines,
        }}
        userGymId={dbUser.gymId}
      />
    </div>
  );
}