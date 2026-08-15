import type { DiscoveryCard } from "@gymatch/core";
import { Image, StyleSheet, Text, View } from "react-native";
import type { ComposedGesture, GestureType } from "react-native-gesture-handler";
import { GestureDetector } from "react-native-gesture-handler";
import type { SharedValue } from "react-native-reanimated";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";

import { DISCIPLINE_LABELS, EXP_LABELS } from "@/lib/labels";
import { colors } from "@/theme";

const CARD_Z_BASE = 100;

interface SwipeCardProps {
  card: DiscoveryCard;
  isTop: boolean;
  index: number;
  tx: SharedValue<number>;
  rotate: SharedValue<number>;
  flyDistance: number;
  gesture?: ComposedGesture | GestureType;
}

/**
 * A single deck card. The top card is draggable (gesture attached by
 * CardStack); the cards behind are static and slightly scaled/offset to fake
 * depth, growing subtly as the top card is dragged away.
 */
export function SwipeCard({
  card,
  isTop,
  index,
  tx,
  rotate,
  flyDistance,
  gesture,
}: SwipeCardProps) {
  const animatedStyle = useAnimatedStyle(() => {
    if (isTop) {
      return {
        transform: [{ translateX: tx.value }, { rotate: `${rotate.value}deg` }],
      };
    }
    const progress = Math.min(Math.abs(tx.value) / flyDistance, 1);
    if (index === 1) {
      return {
        transform: [
          { scale: 0.95 + progress * 0.05 },
          { translateY: 10 - progress * 10 },
        ],
      };
    }
    return { transform: [{ scale: 0.9 }, { translateY: 20 }] };
  });

  const likeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [0, flyDistance * 0.3], [0, 1], Extrapolation.CLAMP),
    transform: [{ rotate: "-18deg" }],
  }));

  const passStyle = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [-flyDistance * 0.3, 0], [1, 0], Extrapolation.CLAMP),
    transform: [{ rotate: "18deg" }],
  }));

  const photo = card.photos[0];

  const cardView = (
    <Animated.View
      style={[styles.card, animatedStyle, { zIndex: CARD_Z_BASE - index }]}
      pointerEvents={isTop ? "auto" : "none"}
    >
      {photo ? (
        <Image source={{ uri: photo.url }} style={styles.photo} resizeMode="cover" />
      ) : (
        <View style={styles.photoFallback} />
      )}

      <View style={styles.overlay} pointerEvents="none">
        {isTop ? (
          <>
            <Animated.View style={[styles.stamp, styles.likeStamp, likeStyle]}>
              <Text style={[styles.stampText, styles.likeStampText]}>LIKE</Text>
            </Animated.View>
            <Animated.View style={[styles.stamp, styles.passStamp, passStyle]}>
              <Text style={[styles.stampText, styles.passStampText]}>PASS</Text>
            </Animated.View>
          </>
        ) : null}

        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {card.name}
            </Text>
            {card.experienceLevel ? (
              <View style={styles.experienceChip}>
                <Text style={styles.experienceChipText}>
                  {EXP_LABELS[card.experienceLevel] ?? card.experienceLevel}
                </Text>
              </View>
            ) : null}
          </View>

          {card.gymName ? <Text style={styles.meta}>🏋️ {card.gymName}</Text> : null}
          {card.city ? <Text style={styles.meta}>📍 {card.city}</Text> : null}

          {card.disciplines.length > 0 ? (
            <View style={styles.chipsRow}>
              {card.disciplines.slice(0, 3).map((discipline) => (
                <View key={discipline} style={styles.chip}>
                  <Text style={styles.chipText}>
                    {DISCIPLINE_LABELS[discipline] ?? discipline}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {card.scheduleCompatible ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>✓ Compatible schedule</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );

  if (isTop && gesture) {
    return <GestureDetector gesture={gesture}>{cardView}</GestureDetector>;
  }
  return cardView;
}

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  photo: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  photoFallback: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#27272a",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-end",
  },
  stamp: {
    position: "absolute",
    top: 24,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 3,
  },
  likeStamp: {
    left: 20,
    borderColor: colors.primary,
  },
  passStamp: {
    right: 20,
    borderColor: colors.textMuted,
  },
  stampText: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 2,
  },
  likeStampText: {
    color: colors.primary,
  },
  passStampText: {
    color: colors.textMuted,
  },
  info: {
    padding: 20,
    paddingBottom: 24,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  name: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "800",
    flexShrink: 1,
  },
  experienceChip: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  experienceChipText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "600",
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 2,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  chip: {
    backgroundColor: "rgba(24,24,27,0.85)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "600",
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(16,185,129,0.15)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 10,
  },
  badgeText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: "700",
  },
});