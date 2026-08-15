import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type Session } from "@supabase/supabase-js";
import { Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be set (see apps/mobile/.env.example)"
  );
}

/**
 * Supabase client for React Native.
 *
 * Uses AsyncStorage for session persistence and `react-native-url-polyfill`
 * (imported above) so supabase-js gets a `URL`/`URLSearchParams` it can use.
 * `detectSessionInUrl` is false: OAuth tokens arrive via deep link and are
 * applied explicitly with `supabase.auth.setSession` (see lib/auth/oauth).
 *
 * `storage` is only set on native platforms: AsyncStorage's web adapter reads
 * `window` at module scope, which crashes Node SSR during `expo export`.
 * On web, supabase-js falls back to its browser-safe default storage.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    ...(Platform.OS !== "web" ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export async function getSession(): Promise<Session | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

/** Access token to attach as `Authorization: Bearer <token>` on API calls. */
export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  return session?.access_token ?? null;
}