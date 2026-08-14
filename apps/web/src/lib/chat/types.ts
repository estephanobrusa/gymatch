/**
 * Chat feature types.
 *
 * MatchPreview    — summary card shown in the /matches list
 * ChatMessage     — a single message in a conversation
 * ConversationPage — a paginated slice of messages
 */

export interface MatchPreview {
  matchId: string;
  conversationId: string;
  matchedUser: {
    id: string;
    name: string;
    photoUrl: string | null;
  };
  lastMessage: {
    body: string;
    createdAt: string; // ISO string
    senderId: string;
  } | null;
  unreadCount: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string; // ISO string
}

export interface ConversationPage {
  messages: ChatMessage[];
  nextCursor: string | null;
}
