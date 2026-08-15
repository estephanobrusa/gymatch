import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import type { DiscoveryCard } from "@gymatch/core";
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { DISCIPLINE_LABELS, EXP_LABELS, GOAL_LABELS } from "@/lib/labels";
import { colors } from "@/theme";

interface ProfileModalProps {
  card: DiscoveryCard | null;
  onClose: () => void;
}

/**
 * Detail view for a discovery card (tap on the top card to open): photo
 * gallery with tap zones + dots, then the full profile info.
 */
export function ProfileModal({ card, onClose }: ProfileModalProps) {
  const [photoIndex, setPhotoIndex] = useState(0);

  if (!card) return null;

  const photo = card.photos[photoIndex];
  const photoCount = card.photos.length;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.gallery}>
            {photo ? (
              <Image source={{ uri: photo.url }} style={styles.galleryImage} resizeMode="cover" />
            ) : (
              <View style={styles.galleryFallback} />
            )}

            {photoCount > 1 ? (
              <>
                <View style={styles.dots}>
                  {card.photos.map((_item, i) => (
                    <View key={i} style={[styles.dot, i === photoIndex ? styles.dotActive : null]} />
                  ))}
                </View>
                <Pressable
                  style={[styles.tapZone, styles.tapLeft]}
                  onPress={() => setPhotoIndex((i) => Math.max(0, i - 1))}
                />
                <Pressable
                  style={[styles.tapZone, styles.tapRight]}
                  onPress={() => setPhotoIndex((i) => Math.min(photoCount - 1, i + 1))}
                />
              </>
            ) : null}

            <Pressable style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={18} color={colors.white} />
            </Pressable>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{card.name}</Text>
              {card.experienceLevel ? (
                <View style={styles.expChip}>
                  <Text style={styles.expChipText}>
                    {EXP_LABELS[card.experienceLevel] ?? card.experienceLevel}
                  </Text>
                </View>
              ) : null}
            </View>

            {card.city || card.gymName ? (
              <View style={styles.metaRow}>
                {card.city ? (
                  <View style={styles.metaItem}>
                    <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                    <Text style={styles.metaText}>{card.city}</Text>
                  </View>
                ) : null}
                {card.gymName ? (
                  <View style={styles.metaItem}>
                    <Ionicons name="barbell-outline" size={14} color={colors.textMuted} />
                    <Text style={styles.metaText}>{card.gymName}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {card.scheduleCompatible ? (
              <View style={styles.scheduleChip}>
                <Ionicons name="calendar-outline" size={15} color={colors.success} />
                <Text style={styles.scheduleChipText}>Trains at compatible times</Text>
              </View>
            ) : null}

            {card.disciplines.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Disciplines</Text>
                <View style={styles.chipsRow}>
                  {card.disciplines.map((discipline) => (
                    <View key={discipline} style={styles.disciplineChip}>
                      <Text style={styles.disciplineChipText}>
                        {DISCIPLINE_LABELS[discipline] ?? discipline}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {card.fitnessGoals.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Goals</Text>
                <View style={styles.chipsRow}>
                  {card.fitnessGoals.map((goal) => (
                    <View key={goal} style={styles.goalChip}>
                      <Text style={styles.goalChipText}>{GOAL_LABELS[goal] ?? goal}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  sheet: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "88%",
    backgroundColor: colors.surface,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  gallery: {
    width: "100%",
    aspectRatio: 4 / 3,
    backgroundColor: colors.border,
  },
  galleryImage: {
    width: "100%",
    height: "100%",
  },
  galleryFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.border,
  },
  dots: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  dotActive: {
    width: 20,
    backgroundColor: colors.white,
  },
  tapZone: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "33%",
  },
  tapLeft: {
    left: 0,
  },
  tapRight: {
    right: 0,
  },
  closeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flexGrow: 0,
  },
  contentInner: {
    padding: 20,
    paddingBottom: 28,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  name: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  expChip: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  expChipText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginTop: 8,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  scheduleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(16,185,129,0.12)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 16,
  },
  scheduleChipText: {
    color: colors.success,
    fontSize: 14,
    fontWeight: "600",
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  disciplineChip: {
    backgroundColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  disciplineChipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
  goalChip: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  goalChipText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "600",
  },
});