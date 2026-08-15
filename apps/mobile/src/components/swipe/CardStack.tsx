/* eslint-disable react-hooks/immutability -- reanimated SharedValues are
   intentionally mutable; the React Compiler lint rule cannot model them. */
import { useCallback, useEffect, useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import { isFeatureEnabled, useSwipeStore } from "@gymatch/core";
import type { DiscoveryCard, SwipeDirection } from "@gymatch/core";
import {
  interpolate,
  runOnJS,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import type { DiscoveryFeedControls } from "@/hooks/use-discovery";
import { recordSwipe } from "@/lib/api/client";
import { colors } from "@/theme";

import { ActionButtons } from "./ActionButtons";
import { SwipeCard } from "./SwipeCard";

const MAX_VISIBLE_CARDS = 3;
const PREFETCH_THRESHOLD = 2;
const SWIPE_THRESHOLD = 110;
const SWIPE_VELOCITY = 900;
const FLY_DURATION_MS = 240;
const MAX_TILT_DEG = 14;

interface CardStackProps {
  token: string;
  feed: DiscoveryFeedControls;
  onOpenProfile: (card: DiscoveryCard) => void;
}

/**
 * The discovery deck: up to `MAX_VISIBLE_CARDS` stacked cards, the top one
 * draggable. Dragging past the threshold (or tapping a button) flies the card
 * off-screen, then records the swipe through the store — the store calls the
 * API and re-inserts the card on failure.
 */
export function CardStack({ token, feed, onOpenProfile }: CardStackProps) {
  const { width } = useWindowDimensions();
  const flyDistance = width + 40;

  const stack = useSwipeStore((s) => s.stack);
  const isAnimating = useSwipeStore((s) => s.isAnimating);
  const swipe = useSwipeStore((s) => s.swipe);
  const rewind = useSwipeStore((s) => s.rewind);
  const lastSwiped = useSwipeStore((s) => s.lastSwiped);

  const { fetchNextPage, hasNextPage, isFetchingNextPage } = feed;

  const tx = useSharedValue(0);
  const rotate = useSharedValue(0);
  // Shared value (not a ref): read from the UI-thread gesture callbacks.
  const isFlying = useSharedValue(false);

  // Auto-load the next page when the stack is running low.
  useEffect(() => {
    if (stack.length <= PREFETCH_THRESHOLD && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [stack.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const performSwipe = useCallback(
    (direction: SwipeDirection, card: DiscoveryCard) => {
      isFlying.value = false;
      // Reset the shared values before the store shifts the card, so the next
      // top card never renders mid-flight for a frame.
      tx.value = 0;
      rotate.value = 0;
      void swipe(direction, () => recordSwipe(token, card.id, direction));
    },
    [isFlying, tx, rotate, swipe, token]
  );

  const flyOff = useCallback(
    (direction: SwipeDirection, card: DiscoveryCard) => {
      isFlying.value = true;
      const target = direction === "LIKE" ? flyDistance : -flyDistance;
      tx.value = withTiming(target, { duration: FLY_DURATION_MS }, (finished) => {
        if (finished) runOnJS(performSwipe)(direction, card);
      });
      rotate.value = withTiming(
        direction === "LIKE" ? MAX_TILT_DEG : -MAX_TILT_DEG,
        { duration: FLY_DURATION_MS }
      );
    },
    [isFlying, flyDistance, tx, rotate, performSwipe]
  );

  const topCard = stack[0] ?? null;

  const gesture = useMemo(() => {
    if (!topCard) return undefined;

    const pan = Gesture.Pan()
      .enabled(!isAnimating)
      .minDistance(8)
      .onStart(() => {
        if (isFlying.value) return;
      })
      .onUpdate((event) => {
        if (isFlying.value) return;
        tx.value = event.translationX;
        rotate.value = interpolate(
          event.translationX,
          [-flyDistance, 0, flyDistance],
          [-MAX_TILT_DEG, 0, MAX_TILT_DEG]
        );
      })
      .onEnd((event) => {
        if (isFlying.value) return;
        const shouldSwipe =
          Math.abs(event.translationX) > SWIPE_THRESHOLD ||
          Math.abs(event.velocityX) > SWIPE_VELOCITY;
        if (shouldSwipe) {
          flyOff(event.translationX > 0 ? "LIKE" : "PASS", topCard);
        } else {
          tx.value = withSpring(0);
          rotate.value = withSpring(0);
        }
      });

    const tap = Gesture.Tap()
      .maxDuration(250)
      .maxDistance(10)
      .onEnd((_event, success) => {
        if (success && topCard) runOnJS(onOpenProfile)(topCard);
      });

    return Gesture.Exclusive(tap, pan);
  }, [topCard, isAnimating, isFlying, flyDistance, tx, rotate, flyOff, onOpenProfile]);

  const handleButtonSwipe = useCallback(
    (direction: SwipeDirection) => {
      if (!topCard || isAnimating) return;
      flyOff(direction, topCard);
    },
    [topCard, isAnimating, flyOff]
  );

  const handleRewind = useCallback(() => {
    if (isAnimating || !lastSwiped) return;
    rewind();
  }, [isAnimating, lastSwiped, rewind]);

  const showRewind = useMemo(() => isFeatureEnabled("REWIND", "EXPO_PUBLIC_"), []);

  const buttons = (
    <ActionButtons
      showRewind={showRewind}
      disabled={isAnimating || !topCard}
      canRewind={!!lastSwiped && !isAnimating}
      onLike={() => handleButtonSwipe("LIKE")}
      onPass={() => handleButtonSwipe("PASS")}
      onRewind={handleRewind}
    />
  );

  if (stack.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.deck}>
          <View style={styles.emptyWrap}>
            {feed.isFetchingNextPage ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : (
              <Text style={styles.emptyText}>No more profiles — check back later!</Text>
            )}
          </View>
        </View>
        {buttons}
      </View>
    );
  }

  const visible = stack.slice(0, MAX_VISIBLE_CARDS);

  return (
    <View style={styles.container}>
      <View style={styles.deck}>
        {visible.map((card, index) => (
          <SwipeCard
            key={card.id}
            card={card}
            index={index}
            isTop={index === 0}
            tx={tx}
            rotate={rotate}
            flyDistance={flyDistance}
            {...(gesture ? { gesture } : {})}
          />
        ))}
      </View>
      {buttons}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  deck: {
    flex: 1,
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 16,
    textAlign: "center",
  },
});