import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { addLog } from "@/lib/debug-log";
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
// There is no error thrown when this mismatches — Supabase just silently
// substitutes the dashboard's web Site URL and opens an in-app browser
// pointed at it, which looks like "nothing happened" / "OAuth is broken"
// with no diagnostic. If sign-in opens a browser instead of returning to
// the app, check the registered redirect URL first.
addLog(`[OAuth] OAUTH_REDIRECT_URI = ${OAUTH_REDIRECT_URI}`);

export async function createSessionFromUrl(url: string): Promise<boolean> {
  addLog(`[OAuth] createSessionFromUrl received: ${url}`);
  const { queryParams } = Linking.parse(url);
  addLog(`[OAuth] parsed queryParams keys: ${Object.keys(queryParams ?? {}).join(", ")}`);
  const accessToken = queryParams?.access_token;
  const refreshToken = queryParams?.refresh_token;

  if (typeof accessToken !== "string" || typeof refreshToken !== "string") {
    addLog("[OAuth] MISSING access_token or refresh_token — NOT applying session");
    return false;
  }

  addLog("[OAuth] tokens found — applying session (setSession)");
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) {
    addLog(`[OAuth] setSession ERROR: ${error.message}`);
    throw error;
  }

  addLog("[OAuth] setSession OK — calling authSync (POST /auth/sync)");
  // Ensure the Prisma user row exists before any other endpoint is used
  // (mirrors the web's syncUser at the OAuth callback). Without this, the
  // API layer cannot resolve the DB user and every request would fail.
  await authSync(accessToken);

  addLog("[OAuth] authSync OK — session fully established");
  return true;
}

export async function signInWithGoogle(): Promise<void> {
  addLog("[OAuth] signInWithGoogle called");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: OAUTH_REDIRECT_URI,
      skipBrowserRedirect: true,
    },
  });
  if (error) {
    addLog(`[OAuth] signInWithOAuth ERROR: ${error.message}`);
    throw error;
  }
  if (!data.url) throw new Error("OAuth failed: no authorization URL returned");

  // DEBUG: the authorize URL Supabase generated — contains redirect_to that
  // Supabase will honor after Google auth.
  addLog(`[OAuth] authorize URL: ${data.url}`);
  const redirectToMatch = /redirect_to=([^&]+)/.exec(data.url);
  addLog(
    `[OAuth] redirect_to in URL: ${
      redirectToMatch?.[1] ? decodeURIComponent(redirectToMatch[1]) : "(not found in URL)"
    }`
  );

  const result = await WebBrowser.openAuthSessionAsync(data.url, OAUTH_REDIRECT_URI);
  addLog(`[OAuth] openAuthSessionAsync result type: ${result.type}`);
  if (result.type !== "success") {
    addLog(`[OAuth] OAuth flow cancelled or dismissed — type: ${result.type}`);
    throw new Error("OAuth flow cancelled");
  }

  addLog(`[OAuth] result.url: ${result.url ?? "(none)"}`);
  await createSessionFromUrl(result.url);
}