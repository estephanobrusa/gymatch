"use client";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

/**
 * Google OAuth sign-in button.
 *
 * Self-contained client component — no props needed.
 * Calls signInWithOAuth which redirects to Google; the callback lands on
 * /auth/callback where the session is established.
 */
export function LoginButton() {
  const supabase = createClient();

  async function handleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <Button onClick={handleSignIn} size="lg">
      Sign in with Google
    </Button>
  );
}
