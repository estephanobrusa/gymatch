"use server";

import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/auth/admin";
import { sendPushToUser } from "@/lib/push/actions";
import {
  getMatchesForUser,
  getConversationMessages,
  sendMessageForUser,
  markConversationReadForUser,
  unmatchForUser,
} from "./service";
import type { ChatMessage, ConversationPage, MatchPreview } from "@gymatch/core";

export type ActionResult = { success: true } | { error: string };

/**
 * Returns the DB user id for the currently authenticated user.
 * Redirects to /login if unauthenticated or missing from DB.
 */
async function resolveCurrentUserId(): Promise<string> {
  const authUser = await getUser();
  if (!authUser) redirect("/login");

  const dbUser = await prismaAdmin.user.findUnique({
    where: { supabaseId: authUser.id },
    select: { id: true },
  });

  if (!dbUser) redirect("/login");
  return dbUser.id;
}

/**
 * Returns all matches for the current user.
 * Each match includes: conversationId, matchedUser (name + first photo),
 * lastMessage, and unreadCount (MVP: all messages from the other user).
 */
export async function getMatchesAction(): Promise<MatchPreview[]> {
  const currentUserId = await resolveCurrentUserId();
  return getMatchesForUser(currentUserId);
}

/**
 * Returns paginated messages for a conversation (oldest first).
 * Uses cursor-based pagination — cursor is the createdAt ISO string of the
 * oldest message already loaded. Returns up to 20 messages per page.
 *
 * Verifies the current user is a participant before returning data.
 */
export async function getMessagesAction(
  conversationId: string,
  cursor?: string
): Promise<ConversationPage> {
  const currentUserId = await resolveCurrentUserId();
  const page = await getConversationMessages(currentUserId, conversationId, cursor);
  if (!page) redirect("/matches");
  return page;
}

/**
 * Creates a new message in the given conversation.
 * Verifies the current user is a participant before writing.
 */
export async function sendMessageAction(
  conversationId: string,
  body: string
): Promise<ChatMessage> {
  const currentUserId = await resolveCurrentUserId();
  const { message, otherUserId } = await sendMessageForUser(
    currentUserId,
    conversationId,
    body
  );

  // Fire-and-forget push to the other participant
  const sender = await prismaAdmin.user.findUnique({
    where: { id: currentUserId },
    select: { name: true },
  });
  const trimmed = body.trim();
  const messagePreview = trimmed.length > 60 ? trimmed.slice(0, 57) + "..." : trimmed;
  sendPushToUser(otherUserId, {
    title: "New message",
    body: `${sender?.name ?? "Someone"}: ${messagePreview}`,
    url: `/matches/${conversationId}`,
  }).catch(() => {});

  return message;
}

/**
 * Marks all unread messages in a conversation as read.
 * Only marks messages sent by the OTHER user (not by the current user).
 * Called when the user opens a conversation.
 */
export async function markAsReadAction(conversationId: string): Promise<void> {
  const currentUserId = await resolveCurrentUserId();
  await markConversationReadForUser(currentUserId, conversationId);
}

/**
 * Resolves the conversationId for a given matchId.
 * Used by MatchModal to navigate directly to the chat.
 */
export async function getConversationIdAction(matchId: string): Promise<string | null> {
  const currentUserId = await resolveCurrentUserId();

  const match = await prismaAdmin.match.findUnique({
    where: { id: matchId },
    include: {
      conversations: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { id: true },
      },
    },
  });

  if (
    !match ||
    (match.userAId !== currentUserId && match.userBId !== currentUserId)
  ) {
    return null;
  }

  return match.conversations[0]?.id ?? null;
}

/**
 * Removes an existing match. Deletes the Match row — the Conversation and
 * Message rows cascade-delete automatically (schema onDelete: Cascade).
 * Both users lose access to the conversation and the match disappears from
 * both match lists.
 *
 * Returns a structured ActionResult (no redirect) so the client can show a
 * toast on failure.
 */
export async function unmatchAction(matchId: string): Promise<ActionResult> {
  const authUser = await getUser();
  if (!authUser) return { error: "auth" };

  const dbUser = await prismaAdmin.user.findUnique({
    where: { supabaseId: authUser.id },
    select: { id: true },
  });
  if (!dbUser) return { error: "auth" };

  return unmatchForUser(dbUser.id, matchId);
}