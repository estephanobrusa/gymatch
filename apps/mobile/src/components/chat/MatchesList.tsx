import type { MatchPreview } from "@gymatch/core";
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { formatRelativeTime } from "@/lib/format";
import { colors } from "@/theme";

interface MatchesListProps {
  matches: MatchPreview[];
  onSelect: (match: MatchPreview) => void;
  onDiscover: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}

/** Matches tab list: avatar, name, last message preview and unread badge. */
export function MatchesList({
  matches,
  onSelect,
  onDiscover,
  onRefresh,
  refreshing,
}: MatchesListProps) {
  return (
    <FlatList
      data={matches}
      keyExtractor={(item) => item.conversationId}
      contentContainerStyle={matches.length === 0 ? styles.emptyContent : styles.listContent}
      renderItem={({ item }) => <MatchRow match={item} onPress={() => onSelect(item)} />}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
      ListEmptyComponent={<EmptyState onDiscover={onDiscover} />}
    />
  );
}

function MatchRow({ match, onPress }: { match: MatchPreview; onPress: () => void }) {
  const hasUnread = match.unreadCount > 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.avatarWrap}>
        {match.matchedUser.photoUrl ? (
          <Image source={{ uri: match.matchedUser.photoUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarFallbackText}>
              {match.matchedUser.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        {hasUnread ? (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>
              {match.unreadCount > 9 ? "9+" : match.unreadCount}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, hasUnread ? styles.nameUnread : null]} numberOfLines={1}>
            {match.matchedUser.name}
          </Text>
          {match.lastMessage ? (
            <Text style={styles.time}>{formatRelativeTime(match.lastMessage.createdAt)}</Text>
          ) : null}
        </View>
        <Text
          style={[styles.preview, hasUnread ? styles.previewUnread : null]}
          numberOfLines={1}
        >
          {match.lastMessage ? match.lastMessage.body : "Start the conversation!"}
        </Text>
      </View>
    </Pressable>
  );
}

function EmptyState({ onDiscover }: { onDiscover: () => void }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>No matches yet</Text>
      <Text style={styles.emptySubtitle}>Keep swiping to find your gym partner!</Text>
      <Pressable
        onPress={onDiscover}
        style={({ pressed }) => [styles.discoverButton, pressed && styles.pressed]}
      >
        <Text style={styles.discoverButtonText}>Discover people</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  emptyContent: {
    flexGrow: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  pressed: {
    backgroundColor: colors.border,
  },
  avatarWrap: {
    position: "relative",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: "800",
  },
  unreadBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  unreadBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "800",
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8,
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
    flexShrink: 1,
  },
  nameUnread: {
    fontWeight: "800",
  },
  time: {
    color: colors.textMuted,
    fontSize: 12,
    flexShrink: 0,
  },
  preview: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 2,
  },
  previewUnread: {
    color: colors.textSecondary,
    fontWeight: "600",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 6,
    textAlign: "center",
  },
  discoverButton: {
    marginTop: 20,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  discoverButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
});