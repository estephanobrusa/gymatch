"use server";

import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/auth/admin";
import { sendPushToUser } from "@/lib/push/actions";
import type { ChatMessage, ConversationPage, MatchPreview } from "./types";

const PAGE_SIZE = 20;

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

  const matches = await prismaAdmin.match.findMany({
    where: {
      OR: [{ userAId: currentUserId }, { userBId: currentUserId }],
      AND: [
        // Block filter: exclude matches where a Block exists in either direction
        { userA: { blocksGiven:    { none: { toId:   currentUserId } } } },
        { userA: { blocksReceived: { none: { fromId: currentUserId } } } },
        { userB: { blocksGiven:    { none: { toId:   currentUserId } } } },
        { userB: { blocksReceived: { none: { fromId: currentUserId } } } },
        // Ban filter: exclude matches where either participant is banned
        { userA: { bannedAt: null } },
        { userB: { bannedAt: null } },
      ],
    },
    include: {
      userA: {
        select: {
          id: true,
          name: true,
          photos: { select: { url: true, position: true }, orderBy: { position: "asc" }, take: 1 },
        },
      },
      userB: {
        select: {
          id: true,
          name: true,
          photos: { select: { url: true, position: true }, orderBy: { position: "asc" }, take: 1 },
        },
      },
      conversations: {
        take: 1,
        orderBy: { createdAt: "desc" },
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const previews: MatchPreview[] = [];

  for (const match of matches) {
    const conversation = match.conversations[0];
    if (!conversation) continue; // skip matches with no conversation (shouldn't happen)

    const matchedUser = match.userAId === currentUserId ? match.userB : match.userA;
    const lastMsg = conversation.messages[0] ?? null;

    // Unread: messages from the other user that haven't been read yet
    const unreadCount = await prismaAdmin.message.count({
      where: {
        conversationId: conversation.id,
        senderId: { not: currentUserId },
        readAt: null,
      },
    });

    previews.push({
      matchId: match.id,
      conversationId: conversation.id,
      matchedUser: {
        id: matchedUser.id,
        name: matchedUser.name,
        photoUrl: matchedUser.photos[0]?.url ?? null,
      },
      lastMessage: lastMsg
        ? {
            body: lastMsg.body,
            createdAt: lastMsg.createdAt.toISOString(),
            senderId: lastMsg.senderId,
          }
        : null,
      unreadCount,
    });
  }

  return previews;
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

  // Auth check: ensure current user is part of this conversation's match
  const conversation = await prismaAdmin.conversation.findUnique({
    where: { id: conversationId },
    include: {
      match: { select: { userAId: true, userBId: true } },
    },
  });

  if (
    !conversation ||
    (conversation.match.userAId !== currentUserId &&
      conversation.match.userBId !== currentUserId)
  ) {
    redirect("/matches");
  }

  const messages = await prismaAdmin.message.findMany({
    where: {
      conversationId,
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: PAGE_SIZE + 1,
  });

  const hasMore = messages.length > PAGE_SIZE;
  const page = hasMore ? messages.slice(0, PAGE_SIZE) : messages;
  const nextCursor = hasMore ? page[page.length - 1]?.createdAt.toISOString() ?? null : null;

  return {
    messages: page.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
    })),
    nextCursor,
  };
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

  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error("Message body cannot be empty.");
  }

  // Auth check
  const conversation = await prismaAdmin.conversation.findUnique({
    where: { id: conversationId },
    include: {
      match: { select: { userAId: true, userBId: true } },
    },
  });

  if (
    !conversation ||
    (conversation.match.userAId !== currentUserId &&
      conversation.match.userBId !== currentUserId)
  ) {
    throw new Error("Unauthorized.");
  }

  // Determine the other participant
  const otherUserId =
    conversation.match.userAId === currentUserId
      ? conversation.match.userBId
      : conversation.match.userAId;

  // Block guard: reject if a Block exists in either direction
  const block = await prismaAdmin.block.findFirst({
    where: {
      OR: [
        { fromId: currentUserId, toId: otherUserId },
        { fromId: otherUserId,   toId: currentUserId },
      ],
    },
  });

  if (block) {
    throw new Error("Blocked.");
  }

  const message = await prismaAdmin.message.create({
    data: {
      conversationId,
      senderId: currentUserId,
      body: trimmed,
    },
  });

  // Notify the other participant about the new message
  await prismaAdmin.notification.create({
    data: {
      userId: otherUserId,
      type: "NEW_MESSAGE",
      actorId: currentUserId,
      conversationId,
    },
  });

  // Fire-and-forget push to the other participant
  const sender = await prismaAdmin.user.findUnique({
    where: { id: currentUserId },
    select: { name: true },
  });
  const messagePreview = trimmed.length > 60 ? trimmed.slice(0, 57) + "..." : trimmed;
  sendPushToUser(otherUserId, {
    title: "New message",
    body: `${sender?.name ?? "Someone"}: ${messagePreview}`,
    url: `/matches/${conversationId}`,
  }).catch(() => {});

  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
  };
}

/**
 * Marks all unread messages in a conversation as read.
 * Only marks messages sent by the OTHER user (not by the current user).
 * Called when the user opens a conversation.
 */
export async function markAsReadAction(conversationId: string): Promise<void> {
  const currentUserId = await resolveCurrentUserId();

  // Verify participation
  const conversation = await prismaAdmin.conversation.findUnique({
    where: { id: conversationId },
    include: { match: { select: { userAId: true, userBId: true } } },
  });

  if (
    !conversation ||
    (conversation.match.userAId !== currentUserId &&
      conversation.match.userBId !== currentUserId)
  ) {
    return;
  }

  await prismaAdmin.message.updateMany({
    where: {
      conversationId,
      senderId: { not: currentUserId },
      readAt: null,
    },
    data: { readAt: new Date() },
  });
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

  const currentUserId = dbUser.id;

  try {
    const match = await prismaAdmin.match.findUnique({
      where: { id: matchId },
      select: { id: true, userAId: true, userBId: true },
    });

    // Match not found, or the current user is not a participant
    if (
      !match ||
      (match.userAId !== currentUserId && match.userBId !== currentUserId)
    ) {
      return { error: match ? "unauthorized" : "not_found" };
    }

    await prismaAdmin.match.delete({ where: { id: matchId } });

    return { success: true };
  } catch {
    return { error: "failed" };
  }
}
