import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/auth/admin";
import { EventForm } from "@/components/events/EventForm";

export default async function NewEventPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const dbUser = await prismaAdmin.user.findUnique({
    where: { supabaseId: user.id },
    select: { gymId: true, disciplines: true },
  });
  if (!dbUser) redirect("/login");

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/events"
          className="p-2 rounded-full hover:bg-muted transition-colors"
          aria-label="Back to events"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">New Event</h1>
      </div>

      <EventForm
        mode="create"
        userGymId={dbUser.gymId}
        userDisciplines={dbUser.disciplines}
      />
    </div>
  );
}