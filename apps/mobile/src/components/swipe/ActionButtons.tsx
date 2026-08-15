import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { colors } from "@/theme";

interface ActionButtonsProps {
  showRewind: boolean;
  disabled: boolean;
  canRewind: boolean;
  onLike: () => void;
  onPass: () => void;
  onRewind: () => void;
}

/** PASS / LIKE (and optionally REWIND) round buttons below the deck. */
export function ActionButtons({
  showRewind,
  disabled,
  canRewind,
  onLike,
  onPass,
  onRewind,
}: ActionButtonsProps) {
  return (
    <View style={styles.row}>
      {showRewind ? (
        <Pressable
          onPress={onRewind}
          disabled={!canRewind}
          style={({ pressed }) => [
            styles.rewind,
            !canRewind && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="arrow-undo" size={24} color="#f59e0b" />
        </Pressable>
      ) : null}

      <Pressable
        onPress={onPass}
        disabled={disabled}
        style={({ pressed }) => [
          styles.circle,
          styles.pass,
          disabled && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name="close" size={36} color={colors.textMuted} />
      </Pressable>

      <Pressable
        onPress={onLike}
        disabled={disabled}
        style={({ pressed }) => [
          styles.circle,
          styles.like,
          disabled && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name="heart" size={32} color={colors.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    paddingBottom: 8,
    paddingTop: 12,
  },
  circle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  like: {
    borderColor: "#fecdd3",
  },
  pass: {
    borderColor: "#3f3f46",
  },
  rewind: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fef3c7",
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    transform: [{ scale: 0.94 }],
  },
});