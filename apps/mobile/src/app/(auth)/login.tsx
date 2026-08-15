import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "@/hooks/use-auth";

export default function LoginScreen() {
  const { signInWithGoogle } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
});