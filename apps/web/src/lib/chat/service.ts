import { prismaAdmin } from "@/lib/auth/admin";
import type { ChatMessage, ConversationPage, MatchPreview } from "@gymatch/core";

export const CHAT_PAGE_SIZE = 20;

export type ActionResult = { success: true } | { error: string };

/** Thrown when the message body is empty (after trimming). */
export class EmptyMessageError extends Error {}

/** Thrown when the user is not a participant of the conversation. */
export class ConversationAccessError extends Error {}

/** Thrown when a Block exists in either direction with the other participant. */
export class ConversationBlockedError extends Error {}

export type SentMessage = {
  message: ChatMessage;
  otherUserId: string;
};

/**
 * Returns all matches for a user.
 * Each match includes: conversationId, matchedUser (name + first photo),
 * lastMessage, and unreadCount (MVP: all messages from the other user).
 */
export async function getMatchesForUser(currentUserId: string): Promise<MatchPreview[]> {
  const matches = await prismaAdmin.match.findMany({
    where: {
      OR: [{ userAId: currentUserId }, { userBId: currentUserId }],
      AND: [
        // Block filter: exclude matches where a Block exists in either direction
        { userA: { blocksGiven: { none: { toId: currentUserId } } } },
        { userA: { blocksReceived: { none: { fromId: currentUserId } } } },
        { userB: { blocksGiven: { none: { toId: currentUserId } } } },
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
 * Cursor-based pagination — cursor is the createdAt ISO string of the oldest
 * message already loaded. Returns up to CHAT_PAGE_SIZE messages per page.
 *
 * Returns null when the conversation does not exist or the user is not a
 * participant (callers map that to 403/404).
 */
export async function getConversationMessages(
  currentUserId: string,
  conversationId: string,
  cursor?: string
): Promise<ConversationPage | null> {
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
    return null;
  }

  const messages = await prismaAdmin.message.findMany({
    where: {
      conversationId,
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: CHAT_PAGE_SIZE + 1,
  });

  const hasMore = messages.length > CHAT_PAGE_SIZE;
  const page = hasMore ? messages.slice(0, CHAT_PAGE_SIZE) : messages;
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
 *
 * Throws EmptyMessageError / ConversationAccessError / ConversationBlockedError.
 * Returns the message plus the other participant's id (for push delivery).
 */
export async function sendMessageForUser(
  currentUserId: string,
  conversationId: string,
  body: string
): Promise<SentMessage> {
  const trimmed = body.trim();
  if (!trimmed) {
    throw new EmptyMessageError("Message body cannot be empty.");
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
    throw new ConversationAccessError("Unauthorized.");
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
        { fromId: otherUserId, toId: currentUserId },
      ],
    },
  });

  if (block) {
    throw new ConversationBlockedError("Blocked.");
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

  return {
    message: {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
    },
    otherUserId,
  };
}

/**
 * Marks all unread messages in a conversation as read.
 * Only marks messages sent by the OTHER user (not by the current user).
 * No-op when the user is not a participant (matches the web action behavior).
 */
export async function markConversationReadForUser(
  currentUserId: string,
  conversationId: string
): Promise<void> {
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
 * Removes an existing match. Deletes the Match row — the Conversation and
 * Message rows cascade-delete automatically (schema onDelete: Cascade).
 *
 * Returns a structured ActionResult (no redirect).
 */
export async function unmatchForUser(
  currentUserId: string,
  matchId: string
): Promise<ActionResult> {
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