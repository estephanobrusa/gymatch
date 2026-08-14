import { getUser } from "@/lib/auth";
import { signOut } from "@/lib/auth/actions";

export const metadata = {
  title: "You're on the waitlist",
  robots: { index: false, follow: false },
};

/**
 * Waitlist page — shown to brand-new signups while the admin has the
 * waitlist active. Public route (like /banned), so waitlisted users can
 * see their status without an admitted account.
 */
export default async function WaitlistPage() {
  const user = await getUser();

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-brand-100 dark:bg-brand-950/60 flex items-center justify-center text-2xl">
        ⏳
      </div>
      <div className="space-y-2 max-w-sm">
        <h1 className="text-xl font-bold">You&apos;re on the waitlist</h1>
        <p className="text-sm text-muted-foreground">
          {user?.email ? (
            <>
              <span className="font-medium text-foreground">{user.email}</span>{" "}
              is on the list. We&apos;ll let you know when Gymatch opens up.
            </>
          ) : (
            <>We&apos;ll let you know when Gymatch opens up.</>
          )}
        </p>
      </div>

      {user && (
        <form action={signOut}>
          <button
            type="submit"
            className="px-6 py-2.5 rounded-full border border-border text-muted-foreground font-semibold hover:border-brand-500 hover:text-brand-600 transition-colors"
          >
            Sign out
          </button>
        </form>
      )}
    </div>
  );
}