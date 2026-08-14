import { getUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/auth/admin";
import { signOut } from "@/lib/auth/actions";
import { getMyAppeal } from "@/lib/moderation/queries";
import { AppealForm } from "@/components/admin/AppealForm";

export const metadata = {
  title: "Account banned",
  robots: { index: false, follow: false },
};

export default async function BannedPage() {
  const user = await getUser();

  // Resolve the DB user and their appeal status (if any).
  let appeal: Awaited<ReturnType<typeof getMyAppeal>> = null;
  if (user) {
    const dbUser = await prismaAdmin.user.findUnique({
      where: { supabaseId: user.id },
      select: { id: true },
    });
    if (dbUser) {
      appeal = await getMyAppeal(dbUser.id);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center text-2xl">
        🚫
      </div>
      <div className="space-y-2 max-w-sm">
        <h1 className="text-xl font-bold">Your account has been banned</h1>
        <p className="text-sm text-muted-foreground">
          This account no longer has access to Gymatch. If you believe this is
          a mistake, you can submit an appeal.
        </p>
      </div>

      {/* Appeal status / form */}
      {appeal ? (
        <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl border border-border p-5 text-left space-y-2">
          {appeal.status === "PENDING" && (
            <>
              <p className="text-sm font-semibold">Appeal under review</p>
              <p className="text-xs text-muted-foreground">
                You submitted an appeal on{" "}
                {appeal.createdAt.toLocaleDateString()}. An admin will review it
                shortly.
              </p>
            </>
          )}
          {appeal.status === "REJECTED" && (
            <>
              <p className="text-sm font-semibold text-destructive">
                Appeal rejected
              </p>
              {appeal.adminNote && (
                <p className="text-xs text-muted-foreground">
                  {appeal.adminNote}
                </p>
              )}
            </>
          )}
          {appeal.status === "ACCEPTED" && (
            <p className="text-sm text-emerald-600 font-semibold">
              Appeal accepted — your account is being restored.
            </p>
          )}
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">View my appeal</summary>
            <p className="mt-2 rounded-lg bg-muted p-3">{appeal.reason}</p>
          </details>
        </div>
      ) : (
        <AppealForm />
      )}

      <form action={signOut}>
        <button
          type="submit"
          className="px-6 py-2.5 rounded-full border border-border text-muted-foreground font-semibold hover:border-destructive hover:text-destructive transition-colors"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
