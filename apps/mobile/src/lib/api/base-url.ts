import Constants from "expo-constants";

const API_PORT = 3000;

/**
 * Base URL of the REST backend (apps/web, /api/v1/*).
 *
 * Resolution order:
 *  1. `EXPO_PUBLIC_API_URL` if set (prod domain, or explicit dev override).
 *  2. Dev only — derive the dev machine's LAN IP from the Metro packager's
 *     `hostUri` (e.g. "192.168.1.10:8081") and point the API port at it, so a
 *     physical device talking to Expo Go reaches the backend running on the
 *     same machine. This matters because on a physical phone "localhost"
 *     resolves to the phone itself, not your dev machine — a server bound to
 *     127.0.0.1 on your laptop is unreachable from the device over WiFi.
 *     Falls back to localhost when the host cannot be derived
 *     (web, simulator without hostUri).
 */
export function getApiBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) return explicit.replace(/\/+$/, "");

  if (__DEV__) {
    const host = deriveDevHost();
    if (host) return `http://${host}:${API_PORT}`;
  }

  return `http://localhost:${API_PORT}`;
}

function deriveDevHost(): string | null {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return null;
  const host = hostUri.split(":")[0];
  return host || null;
}