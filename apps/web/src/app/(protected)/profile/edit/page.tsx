import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getUser } from "@/lib/auth";
import { getProfileUser } from "@/lib/profile/queries";
import { PhotoManager } from "@/components/profile/PhotoManager";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";

export default async function ProfileEditPage() {
  const authUser = await getUser();
  if (!authUser) redirect("/login");

  const profile = await getProfileUser(authUser.id);
  if (!profile) redirect("/login");

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/profile"
          className="p-2 rounded-full hover:bg-muted transition-colors"
          aria-label="Back to profile"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">Edit Profile</h1>
      </div>

      {/* Photos section */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Photos
        </h2>
        <PhotoManager photos={profile.photos} userId={authUser.id} />
      </section>

      {/* Profile form */}
      <ProfileEditForm profile={profile} />
    </div>
  );
}
