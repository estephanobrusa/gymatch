import { useCallback, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { authSync } from "@/lib/api/client";
import { signInWithGoogle } from "@/lib/auth/oauth";
import { supabase } from "@/lib/supabase";

/**
 * Auth state + actions bound to the Supabase client.
 *
 * - Listens to `onAuthStateChange` and exposes `session`/`user`/`loading`.
 * - `signInWithPassword` calls `POST /auth/sync` on success so the Prisma
 *   user row is guaranteed to exist before any other endpoint is used
 *   (mirrors the web's `syncUser` at the OAuth callback).
 * - `signInWithGoogle` runs the native OAuth flow (lib/auth/oauth).
 */
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);
        setUser(data.session?.user ?? null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      }
    );

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (data.session) {
        await authSync(data.session.access_token);
      }
    },
    []
  );

  const signInWithGoogleOAuth = useCallback(() => signInWithGoogle(), []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return {
    session,
    user,
    loading,
    signInWithPassword,
    signInWithGoogle: signInWithGoogleOAuth,
    signOut,
  };
}