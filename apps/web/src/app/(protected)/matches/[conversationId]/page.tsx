import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/auth/admin";
import { getMessagesAction } from "@/lib/chat/actions";
import { ChatWindow } from "@/components/chat/ChatWindow";

interface Props {
  params: Promise<{ conversationId: string }>;
}

export default async function ConversationPage({ params }: Props) {
  const { conversationId } = await params;

  const authUser = await getUser();
  if (!authUser) redirect("/login");

  const dbUser = await prismaAdmin.user.findUnique({
    where: { supabaseId: authUser.id },
    select: { id: true },
  });
  if (!dbUser) redirect("/login");

  // Fetch conversation with match + both users
  const conversation = await prismaAdmin.conversation.findUnique({
    where: { id: conversationId },
    include: {
      match: {
        include: {
          userA: {
            select: {
              id: true,
              name: true,
              photos: {
                select: { url: true, position: true },
                orderBy: { position: "asc" },
                take: 1,
              },
            },
          },
          userB: {
            select: {
              id: true,
              name: true,
              photos: {
                select: { url: true, position: true },
                orderBy: { position: "asc" },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  // Verify participant access
  if (
    !conversation ||
    (conversation.match.userAId !== dbUser.id && conversation.match.userBId !== dbUser.id)
  ) {
    redirect("/matches");
  }

  const otherUser =
    conversation.match.userAId === dbUser.id ? conversation.match.userB : conversation.match.userA;

  const initialPage = await getMessagesAction(conversationId);

  return (
    <main className="flex flex-col h-full min-h-0">
      <ChatWindow
        conversationId={conversationId}
        matchId={conversation.match.id}
        currentUserId={dbUser.id}
        otherUser={{
          id: otherUser.id,
          name: otherUser.name,
          photoUrl: otherUser.photos[0]?.url ?? null,
        }}
        initialMessages={initialPage.messages}
      />
    </main>
  );
}
