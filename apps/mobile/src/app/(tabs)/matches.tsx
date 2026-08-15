import { useCallback } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import type { MatchPreview } from "@gymatch/core";

import { MatchesList } from "@/components/chat/MatchesList";
import { useAuth } from "@/hooks/use-auth";
import { getMatches } from "@/lib/api/client";
import { colors } from "@/theme";

export default function MatchesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();
  const token = session?.access_token ?? null;

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["matches"],
    queryFn: () => getMatches(token ?? ""),
    enabled: !!token,
  });

  const handleSelect = useCallback(
    (match: MatchPreview) => {
      router.push({
        pathname: "/matches/[conversationId]",
        params: {
          conversationId: match.conversationId,
          matchId: match.matchId,
          name: match.matchedUser.name,
          ...(match.matchedUser.photoUrl ? { photoUrl: match.matchedUser.photoUrl } : {}),
        },
      });
    },
    [router]
  );

  const handleDiscover = useCallback(() => {
    router.push("/(tabs)");
  }, [router]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>Matches</Text>
      </View>

      <View style={styles.body}>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : isError ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>Something went wrong loading your matches.</Text>
          </View>
        ) : data ? (
          <MatchesList
            matches={data}
            onSelect={handleSelect}
            onDiscover={handleDiscover}
            onRefresh={() => void refetch()}
            refreshing={isRefetching}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
  },
  body: {
    flex: 1,
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