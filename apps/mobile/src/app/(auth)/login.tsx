import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "@/hooks/use-auth";
import { clearLogs, useDebugLog } from "@/lib/debug-log";

export default function LoginScreen() {
  const { signInWithGoogle } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logs = useDebugLog();

  const handleGoogle = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign in failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>G</Text>
        </View>
        <Text style={styles.title}>Gymatch</Text>
        <Text style={styles.subtitle}>Find your perfect gym match.</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={({ pressed }) => [styles.button, styles.google, pressed && styles.pressed]}
        onPress={handleGoogle}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#18181b" />
        ) : (
          <Text style={styles.googleText}>Continue with Google</Text>
        )}
      </Pressable>

      {/* DEBUG panel — shows OAuth flow events directly on screen.
          Temporary: remove once the OAuth deep-link issue is resolved. */}
      <View style={styles.debugPanel}>
        <View style={styles.debugHeader}>
          <Text style={styles.debugTitle}>DEBUG LOG</Text>
          <Pressable onPress={clearLogs} hitSlop={8}>
            <Text style={styles.debugClear}>clear</Text>
          </Pressable>
        </View>
        <ScrollView style={styles.debugScroll} nestedScrollEnabled>
          {logs.length === 0 ? (
            <Text style={styles.debugLine}>— no events yet —</Text>
          ) : (
            logs.map((l, i) => (
              <Text key={i} style={styles.debugLine}>
                {l.at} {l.msg}
              </Text>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#e11d48",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoText: {
    color: "#fff",
    fontSize: 40,
    fontWeight: "800",
  },
  title: {
    color: "#fafafa",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: "#a1a1aa",
    fontSize: 15,
    marginTop: 8,
  },
  error: {
    color: "#f87171",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 12,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  google: {
    backgroundColor: "#fafafa",
  },
  googleText: {
    color: "#18181b",
    fontSize: 16,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.8,
  },
  debugPanel: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    maxHeight: 220,
    backgroundColor: "rgba(0,0,0,0.85)",
    borderColor: "#3f3f46",
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
  },
  debugHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  debugTitle: {
    color: "#fbbf24",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  debugClear: {
    color: "#71717a",
    fontSize: 12,
  },
  debugScroll: {
    maxHeight: 170,
  },
  debugLine: {
    color: "#a1f0b0",
    fontFamily: "Menlo",
    fontSize: 10,
    lineHeight: 14,
    marginBottom: 2,
  },
});