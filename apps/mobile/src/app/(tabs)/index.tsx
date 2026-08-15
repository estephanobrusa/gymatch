import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { DiscoveryCard } from "@gymatch/core";

import { CardStack } from "@/components/swipe/CardStack";
import { MatchModal } from "@/components/swipe/MatchModal";
import { ProfileModal } from "@/components/swipe/ProfileModal";
import { useAuth } from "@/hooks/use-auth";
import { useDiscoveryFeed } from "@/hooks/use-discovery";
import { colors } from "@/theme";

export default function DiscoveryScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const token = session?.access_token ?? null;

  const feed = useDiscoveryFeed(token);
  const [profileCard, setProfileCard] = useState<DiscoveryCard | null>(null);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.brand}>Gymatch</Text>
      </View>

      <View style={styles.body}>
        {feed.isPending ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : feed.isError ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>
              Something went wrong loading profiles. Please try again.
            </Text>
          </View>
        ) : token ? (
          <CardStack token={token} feed={feed} onOpenProfile={setProfileCard} />
        ) : null}
      </View>

      <MatchModal />
      <ProfileModal card={profileCard} onClose={() => setProfileCard(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    alignItems: "center",
    paddingBottom: 8,
  },
  brand: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  errorText: {
    color: colors.destructive,
    fontSize: 15,
    textAlign: "center",
  },
});