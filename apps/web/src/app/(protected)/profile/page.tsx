import { getUser } from "@/lib/auth";
import { getProfileUser } from "@/lib/profile/queries";
import { signOut } from "@/lib/auth/actions";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { ExperienceLevel } from "@prisma/client";
import { DeleteAccountButton } from "@/components/profile/DeleteAccountButton";
import { ProfilePreview } from "@/components/profile/ProfilePreview";
import { ThemeToggle } from "@/components/profile/ThemeToggle";
import { PrivacyToggles } from "@/components/profile/PrivacyToggles";
import { PushSettings } from "@/components/push/PushSettings";
import { BlockedUsersList } from "@/components/moderation/BlockedUsersList";
import { getBlockedUsers } from "@/lib/moderation/queries";
import type { DiscoveryCard } from "@/lib/swipe/types";
import { DISCIPLINE_LABELS } from "@/lib/disciplines";

// ── Display labels (server-safe, no client deps) ──────────────────────────

const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
  EXPERT: "Expert",
};

// ─────────────────────────────────────────────────────────────────────────

export default async function ProfilePage() {
  const authUser = await getUser();
  if (!authUser) redirect("/login");

  const profile = await getProfileUser(authUser.id);
  if (!profile) redirect("/login");

  const photo = profile.photos[0]?.url;
  const visibleDisciplines = profile.disciplines.slice(0, 3);
  const extraDisciplines = profile.disciplines.length - visibleDisciplines.length;

  const previewCard: DiscoveryCard = {
    id: profile.id,
    name: profile.name ?? "Gymatcher",
    city: profile.city,
    gymName: profile.gym?.name ?? null,
    fitnessGoals: profile.fitnessGoals ?? [],
    disciplines: (profile.disciplines ?? []) as string[],
    experienceLevel: profile.experienceLevel,
    photos: profile.photos.map((p) => ({ url: p.url, position: p.position })),
  };

  return (
    <div className="flex flex-col items-center gap-6 px-6 pt-10 pb-28 max-w-sm mx-auto">
      {/* Avatar */}
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo}
          alt={profile.name}
          className="w-24 h-24 rounded-full object-cover"
        />
      ) : (
        <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center text-3xl font-bold text-muted-foreground">
          {profile.name?.[0]?.toUpperCase() ?? "?"}
        </div>
      )}

      {/* Name, username, city */}
      <div className="text-center w-full">
        <div className="flex items-center justify-center gap-2">
          <p className="text-xl font-bold">{profile.name}</p>
          <Link
            href="/profile/edit"
            className="text-xs px-3 py-1 rounded-full border border-border text-muted-foreground hover:border-brand-500 hover:text-brand-500 transition-colors"
          >
            Edit profile
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">@{profile.username}</p>
        {profile.city && (
          <p className="text-sm text-muted-foreground mt-1">{profile.city}</p>
        )}

        {/* Gym */}
        {profile.gym && (
          <p className="text-sm text-muted-foreground mt-1">
            🏋️ {profile.gym.name}
          </p>
        )}

        {/* Experience level chip */}
        {profile.experienceLevel && (
          <span className="inline-block mt-2 px-2 py-0.5 text-xs font-medium rounded-full bg-muted text-muted-foreground">
            {EXPERIENCE_LEVEL_LABELS[profile.experienceLevel]}
          </span>
        )}

        {/* Discipline chips (max 3 + overflow) */}
        {profile.disciplines.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-center mt-2">
            {visibleDisciplines.map((d) => (
              <span
                key={d}
                className="px-2 py-0.5 text-xs font-medium rounded-full bg-muted text-muted-foreground"
              >
                {DISCIPLINE_LABELS[d]}
              </span>
            ))}
            {extraDisciplines > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-muted text-muted-foreground">
                +{extraDisciplines} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Preview: how others see me */}
      <ProfilePreview card={previewCard} />

      {/* Privacy */}
      <PrivacyToggles
        initialHideProfile={profile.hideProfile}
        initialIncognitoMode={profile.incognitoMode}
      />

      {/* Notifications */}
      <div className="w-full">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
          Notifications
        </p>
        <PushSettings />
      </div>

      {/* Blocked users */}
      <div className="w-full flex flex-col gap-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Blocked users
        </p>
        <BlockedUsersList users={await getBlockedUsers(profile.id)} />
      </div>

      {/* Appearance */}
      <div className="w-full flex flex-col items-center gap-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Appearance</p>
        <ThemeToggle />
      </div>

      {/* Sign out */}
      <form action={signOut} className="w-full">
        <button
          type="submit"
          className="w-full py-2 rounded-full border border-border text-muted-foreground font-semibold hover:border-destructive hover:text-destructive transition-colors"
        >
          Sign out
        </button>
      </form>

      {/* Danger zone: permanently delete account */}
      <DeleteAccountButton />
    </div>
  );
}
