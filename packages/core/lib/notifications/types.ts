import type { NotificationType } from "@prisma/client";

export type NotificationPreview = {
  id: string;
  type: NotificationType;
  actor: { id: string; name: string; photoUrl: string | null } | null;
  matchId: string | null;
  conversationId: string | null;
  read: boolean;
  createdAt: string;
};