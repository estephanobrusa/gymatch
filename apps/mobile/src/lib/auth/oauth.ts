import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { authSync } from "@/lib/api/client";
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

// DEBUG: log the exact redirect URI the app will send to Supabase.
// This must match a Redirect URL registered in the Supabase dashboard,
// otherwise Supabase falls back to the Site URL (localhost:3000) and the
// web app opens instead of returning to the app.
console.log("[OAuth] OAUTH_REDIRECT_URI =", OAUTH_REDIRECT_URI);

export async function createSessionFromUrl(url: string): Promise<boolean> {
  console.log("[OAuth] createSessionFromUrl received:", url);
  const { queryParams } = Linking.parse(url);
  console.log("[OAuth] parsed queryParams keys:", Object.keys(queryParams ?? {}));
  const accessToken = queryParams?.access_token;
  const refreshToken = queryParams?.refresh_token;

  if (typeof accessToken !== "string" || typeof refreshToken !== "string") {
    console.log("[OAuth] MISSING access_token or refresh_token — NOT applying session");
    return false;
  }

  console.log("[OAuth] tokens found — applying session (setSession)");
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) {
    console.log("[OAuth] setSession ERROR:", error.message);
    throw error;
  }

  console.log("[OAuth] setSession OK — calling authSync (POST /auth/sync)");
  // Ensure the Prisma user row exists before any other endpoint is used
  // (mirrors the web's syncUser at the OAuth callback). Without this, the
  // API layer cannot resolve the DB user and every request would fail.
  await authSync(accessToken);

  console.log("[OAuth] authSync OK — session fully established");
  return true;
}

export async function signInWithGoogle(): Promise<void> {
  console.log("[OAuth] signInWithGoogle called");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: OAUTH_REDIRECT_URI,
      skipBrowserRedirect: true,
    },
  });
  if (error) {
    console.log("[OAuth] signInWithOAuth ERROR:", error.message);
    throw error;
  }
  if (!data.url) throw new Error("OAuth failed: no authorization URL returned");

  // DEBUG: the authorize URL Supabase generated — contains redirect_to that
  // Supabase will honor after Google auth.
  console.log("[OAuth] authorize URL:", data.url);
  const redirectToMatch = /redirect_to=([^&]+)/.exec(data.url);
  console.log(
    "[OAuth] redirect_to in URL:",
    redirectToMatch?.[1]
      ? decodeURIComponent(redirectToMatch[1])
      : "(not found in URL)"
  );

  const result = await WebBrowser.openAuthSessionAsync(data.url, OAUTH_REDIRECT_URI);
  console.log("[OAuth] openAuthSessionAsync result type:", result.type);
  if (result.type !== "success") {
    console.log("[OAuth] OAuth flow cancelled or dismissed — type:", result.type);
    throw new Error("OAuth flow cancelled");
  }

  console.log("[OAuth] result.url:", result.url ?? "(none)");
  await createSessionFromUrl(result.url);
}