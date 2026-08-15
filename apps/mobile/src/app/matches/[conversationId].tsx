import { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { MessageBubble } from "@/components/chat/MessageBubble";
import { useAuth } from "@/hooks/use-auth";
import { getMatches, getMe, getMessages, markRead, sendMessage, unmatch } from "@/lib/api/client";
import { colors } from "@/theme";

export default function ConversationScreen() {
  const params = useLocalSearchParams<{
    conversationId: string;
    matchId?: string;
    name?: string;
    photoUrl?: string;
  }>();
  const conversationId = params.conversationId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const token = session?.access_token ?? null;

  const [input, setInput] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);

  const { data: matches } = useQuery({
    queryKey: ["matches"],
    queryFn: () => getMatches(token ?? ""),
    enabled: !!token,
  });

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: () => getMe(token ?? ""),
    enabled: !!token,
  });

  const match = useMemo(
    () => matches?.find((m) => m.conversationId === conversationId),
    [matches, conversationId]
  );

  const otherName = params.name ?? match?.matchedUser.name ?? "Match";
  const otherPhotoUrl = params.photoUrl ?? match?.matchedUser.photoUrl ?? null;
  const currentUserId = me?.user.id;

  const messagesQuery = useInfiniteQuery({
    queryKey: ["messages", conversationId],
    queryFn: ({ pageParam }) => getMessages(token ?? "", conversationId, pageParam ?? undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!token && !!conversationId,
  });

  // Newest first (visual bottom in the inverted list). Pages are fetched newest
  // page first, so sorting by createdAt makes the ordering robust regardless.
  const messages = useMemo(
    () =>
      (messagesQuery.data?.pages ?? [])
        .flatMap((page) => page.messages)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [messagesQuery.data]
  );

  // Mark the conversation read when it opens and whenever new messages arrive.
  useEffect(() => {
    if (!token || !conversationId) return;
    const timer = setTimeout(() => {
      markRead(token, conversationId).catch(() => undefined);
      void queryClient.invalidateQueries({ queryKey: ["matches"] });
    }, 300);
    return () => clearTimeout(timer);
  }, [token, conversationId, queryClient, messages.length]);

  const sendMutation = useMutation({
    mutationFn: (body: string) => sendMessage(token ?? "", conversationId, body),
    onSuccess: () => {
      setInput("");
      setSendError(null);
      void queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      void queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
    onError: () => setSendError("Failed to send. Please try again."),
  });

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate(trimmed);
  }

  const unmatchMutation = useMutation({
    mutationFn: () => unmatch(token ?? "", conversationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["matches"] });
      router.back();
    },
    onError: () => {
      Alert.alert("Something went wrong", "Could not remove the match. Please try again.");
    },
  });

  function confirmUnmatch() {
    Alert.alert(
      `Unmatch with ${otherName}?`,
      "This will permanently remove the match and delete the conversation. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unmatch",
          style: "destructive",
          onPress: () => unmatchMutation.mutate(),
        },
      ]
    );
  }

  function loadOlder() {
    if (messagesQuery.hasNextPage && !messagesQuery.isFetchingNextPage) {
      void messagesQuery.fetchNextPage();
    }
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable style={styles.headerButton} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>

        {otherPhotoUrl ? (
          <Image source={{ uri: otherPhotoUrl }} style={styles.headerAvatar} />
        ) : (
          <View style={[styles.headerAvatar, styles.headerAvatarFallback]}>
            <Text style={styles.headerAvatarText}>{otherName.charAt(0).toUpperCase()}</Text>
          </View>
        )}

        <Text style={styles.headerTitle} numberOfLines={1}>
          {otherName}
        </Text>

        <Pressable
          style={styles.headerButton}
          onPress={confirmUnmatch}
          disabled={unmatchMutation.isPending}
          hitSlop={8}
        >
          <Ionicons name="trash-outline" size={22} color={colors.destructive} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {messagesQuery.isPending ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : messagesQuery.isError ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>Something went wrong loading messages.</Text>
            <Pressable
              style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
              onPress={() => void messagesQuery.refetch()}
            >
              <Text style={styles.retryButtonText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={messages}
            inverted
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MessageBubble message={item} isMine={item.senderId === currentUserId} />
            )}
            contentContainerStyle={
              messages.length === 0 ? styles.messagesEmptyContent : styles.messagesContent
            }
            onEndReached={loadOlder}
            onEndReachedThreshold={0.4}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<Text style={styles.emptyText}>Say hello to {otherName}!</Text>}
            ListFooterComponent={
              messagesQuery.isFetchingNextPage ? (
                <ActivityIndicator size="small" color={colors.primary} style={styles.loadMore} />
              ) : null
            }
          />
        )}

        {sendError ? <Text style={styles.sendError}>{sendError}</Text> : null}

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Type a message…"
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={2000}
          />
          <Pressable
            style={({ pressed }) => [
              styles.sendButton,
              (!input.trim() || sendMutation.isPending) && styles.sendDisabled,
              pressed && styles.pressed,
            ]}
            onPress={handleSend}
            disabled={!input.trim() || sendMutation.isPending}
          >
            <Ionicons name="arrow-up" size={22} color={colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
  },
  headerAvatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "800",
  },
  headerTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
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
  retryButton: {
    marginTop: 16,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
  messagesContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  messagesEmptyContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 15,
    padding: 32,
    textAlign: "center",
  },
  loadMore: {
    paddingVertical: 12,
  },
  sendError: {
    color: colors.destructive,
    fontSize: 13,
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    color: colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.8,
  },
});