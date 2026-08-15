import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { supabase } from "@/lib/supabase";

/**
 * Google OAuth via the native Supabase RN flow:
 *  1. `signInWithOAuth` returns the auth URL (skipBrowserRedirect keeps the
 *     browser closed so we control it).
 *  2. `WebBrowser.openAuthSessionAsync` opens the Supabase-hosted Google flow
 *     in a secure in-app browser.
 *  3. The result URL (`gymatch:///...#access_token=...&refresh_token=...`)
 *     is parsed and the session is applied with `setSession`.
 *
 * The `gymatch` scheme is declared in app.json and must also be registered as
 * a redirect URL in the Supabase dashboard.
 */

export const OAUTH_REDIRECT_URI = Linking.createURL("/");

export async function createSessionFromUrl(url: string): Promise<boolean> {
  const { queryParams } = Linking.parse(url);
  const accessToken = queryParams?.access_token;
  const refreshToken = queryParams?.refresh_token;

  if (typeof accessToken !== "string" || typeof refreshToken !== "string") {
    return false;
  }

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) throw error;
  return true;
}

export async function signInWithGoogle(): Promise<void> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: OAUTH_REDIRECT_URI,
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;
  if (!data.url) throw new Error("OAuth failed: no authorization URL returned");

  const result = await WebBrowser.openAuthSessionAsync(data.url, OAUTH_REDIRECT_URI);
  if (result.type !== "success") {
    throw new Error("OAuth flow cancelled");
  }

  await createSessionFromUrl(result.url);
}