import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { LoginButton } from "@/components/auth/LoginButton";

export const metadata: Metadata = {
  title: "Log In",
  description: "Log in to Gymatch and find your perfect training partner.",
  robots: { index: false, follow: false },
};

/**
 * Login page — server component.
 *
 * If a session already exists, redirect to the home page immediately.
 * Otherwise, render the Google OAuth sign-in button.
 */
export default async function LoginPage() {
  const user = await getUser();

  if (user) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-zinc-950 p-8">
      {/* Logo + wordmark */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-500">
          <span className="text-4xl font-bold text-white">G</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Gymatch</h1>
        <p className="text-sm text-zinc-400">Find your perfect gym match.</p>
      </div>

      {/* Google sign-in */}
      <LoginButton />
    </main>
  );
}
