import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "@/hooks/use-auth";

export default function LoginScreen() {
  const { signInWithPassword, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState<"password" | "google" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePassword = async () => {
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setSubmitting("password");
    setError(null);
    try {
      await signInWithPassword(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed. Try again.");
    } finally {
      setSubmitting(null);
    }
  };

  const handleGoogle = async () => {
    setSubmitting("google");
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign in failed. Try again.");
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>G</Text>
        </View>
        <Text style={styles.title}>Gymatch</Text>
        <Text style={styles.subtitle}>Find your perfect gym match.</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#71717a"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#71717a"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={({ pressed }) => [styles.button, styles.primary, pressed && styles.pressed]}
          onPress={handlePassword}
          disabled={submitting !== null}
        >
          {submitting === "password" ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>Log in</Text>
          )}
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerLabel}>or</Text>
          <View style={styles.divider} />
        </View>

        <Pressable
          style={({ pressed }) => [styles.button, styles.google, pressed && styles.pressed]}
          onPress={handleGoogle}
          disabled={submitting !== null}
        >
          {submitting === "google" ? (
            <ActivityIndicator color="#18181b" />
          ) : (
            <Text style={styles.googleText}>Continue with Google</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
  form: {
    gap: 12,
  },
  input: {
    backgroundColor: "#18181b",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#fafafa",
    fontSize: 16,
  },
  error: {
    color: "#f87171",
    fontSize: 14,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: "#e11d48",
  },
  primaryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
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
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 4,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#27272a",
  },
  dividerLabel: {
    color: "#71717a",
    fontSize: 13,
    textTransform: "uppercase",
  },
});