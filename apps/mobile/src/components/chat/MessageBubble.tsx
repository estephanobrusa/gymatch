import type { ChatMessage } from "@gymatch/core";
import { StyleSheet, Text, View } from "react-native";

import { formatRelativeTime } from "@/lib/format";
import { colors } from "@/theme";

interface MessageBubbleProps {
  message: ChatMessage;
  isMine: boolean;
}

/** Single chat bubble: mine (coral, right-aligned) vs theirs (grey, left). */
export function MessageBubble({ message, isMine }: MessageBubbleProps) {
  return (
    <View style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs]}>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={[styles.body, isMine ? styles.bodyMine : null]}>{message.body}</Text>
        <Text style={[styles.time, isMine ? styles.timeMine : null]}>
          {formatRelativeTime(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginBottom: 8,
  },
  rowMine: {
    justifyContent: "flex-end",
  },
  rowTheirs: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMine: {
    backgroundColor: colors.primaryDark,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  body: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
  },
  bodyMine: {
    color: colors.white,
  },
  time: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
    textAlign: "right",
  },
  timeMine: {
    color: "#fda4af",
  },
});