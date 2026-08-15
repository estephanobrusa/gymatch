import "react-native-url-polyfill/auto";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { Redirect, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAuth } from "@/hooks/use-auth";
import { createSessionFromUrl } from "@/lib/auth/oauth";

const queryClient = new QueryClient();

export default function RootLayout() {
  const { session, loading } = useAuth();

  // Handle the OAuth deep link (gymatch://#access_token=...) when the app is
  // opened from the browser callback, or already running in the background.
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) void createSessionFromUrl(url).catch(() => undefined);
    });
    const subscription = Linking.addEventListener("url", ({ url }) => {
      void createSessionFromUrl(url).catch(() => undefined);
    });
    return () => subscription.remove();
  }, []);

  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#e11d48" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      {session ? <Redirect href="/(tabs)" /> : <Redirect href="/(auth)/login" />}
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0a0a0a",
  },
});