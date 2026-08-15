import { useState } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useSwipeStore } from "@gymatch/core";

import { useAuth } from "@/hooks/use-auth";
import { getMatches } from "@/lib/api/client";
import { colors } from "@/theme";

/**
 * Full-screen overlay shown when a swipe produces a match. "Send message"
 * resolves the conversation id from the matches feed, then navigates to the
 * chat; "Keep swiping" just clears the match state.
 */
export function MatchModal() {
  const currentMatch = useSwipeStore((s) => s.currentMatch);
  const clearMatch = useSwipeStore((s) => s.clearMatch);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const [navigating, setNavigating] = useState(false);

  const matchedName = currentMatch?.matchedUser?.name ?? "your match";
  const photo = currentMatch?.matchedUser?.photos[0];

  async function handleSendMessage() {
    const match = currentMatch;
    if (!match?.matchId || !token || navigating) return;
    setNavigating(true);
    try {
      const matches = await queryClient.fetchQuery({
        queryKey: ["matches"],
        queryFn: () => getMatches(token),
      });
      const preview = matches.find((m) => m.matchId === match.matchId);
      if (preview) {
        clearMatch();
        router.push({
          pathname: "/matches/[conversationId]",
          params: {
            conversationId: preview.conversationId,
            matchId: preview.matchId,
            name: preview.matchedUser.name,
            ...(preview.matchedUser.photoUrl
              ? { photoUrl: preview.matchedUser.photoUrl }
              : {}),
          },
        });
      }
    } catch {
      // Leave the modal open so the user can retry or keep swiping.
    } finally {
      setNavigating(false);
    }
  }

  return (
    <Modal
      visible={!!currentMatch}
      transparent
      animationType="fade"
      onRequestClose={clearMatch}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={clearMatch} />

        <View style={styles.card}>
          <Text style={styles.title}>It&apos;s a Match!</Text>
          <Text style={styles.subtitle}>You and {matchedName} liked each other</Text>

          {photo ? (
            <Image source={{ uri: photo.url }} style={styles.photo} resizeMode="cover" />
          ) : (
            <View style={[styles.photo, styles.photoFallback]}>
              <Text style={styles.photoFallbackText}>{matchedName.charAt(0).toUpperCase()}</Text>
            </View>
          )}

          <Pressable
            onPress={() => void handleSendMessage()}
            disabled={navigating}
            style={({ pressed }) => [
              styles.sendButton,
              navigating && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.sendButtonText}>
              {navigating ? "Opening chat…" : "Send message"}
            </Text>
          </Pressable>

          <Pressable
            onPress={clearMatch}
            disabled={navigating}
            style={({ pressed }) => [
              styles.keepButton,
              navigating && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.keepButtonText}>Keep swiping</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 20,
  },
  photo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.border,
    marginBottom: 24,
  },
  photoFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  photoFallbackText: {
    color: colors.primary,
    fontSize: 40,
    fontWeight: "800",
  },
  sendButton: {
    alignSelf: "stretch",
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  sendButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  keepButton: {
    alignSelf: "stretch",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },
  keepButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.8,
  },
});