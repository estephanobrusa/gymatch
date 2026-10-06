"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { sendMessageAction, markAsReadAction } from "@/lib/chat/actions";
import type { ChatMessage } from "@gymatch/core";
import { ReportModal } from "@/components/moderation/ReportModal";
import { BlockConfirmDialog } from "@/components/moderation/BlockConfirmDialog";
import { UnmatchConfirmDialog } from "@/components/moderation/UnmatchConfirmDialog";

interface OtherUser {
  id: string;
  name: string;
  photoUrl: string | null;
}

interface Props {
  conversationId: string;
  matchId: string;
  currentUserId: string;
  otherUser: OtherUser;
  initialMessages: ChatMessage[];
}

export function ChatWindow({ conversationId, matchId, currentUserId, otherUser, initialMessages }: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const [sendError, setSendError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [unmatchOpen, setUnmatchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Mark messages as read when conversation is opened
  useEffect(() => {
    void markAsReadAction(conversationId);
  }, [conversationId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Supabase Realtime subscription
  //
  // One channel, four `postgres_changes` listeners, all scoped to this
  // conversation/match so a reader doesn't have to scan each `.on()` block
  // separately to know what this component reacts to:
  //   1. INSERT on `messages`  — new message arrives, append to local state
  //   2. DELETE on `matches`   — the other user unmatched, leave the chat
  //   3. INSERT on `blocks`    — current user got blocked, leave the chat
  //   4. UPDATE on `users`     — other user got banned, leave the chat
  useEffect(() => {

    const supabase = createClient();

    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversationId=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            conversationId: string;
            senderId: string;
            body: string;
            createdAt: string;
          };

          // Avoid duplicating messages sent by the current user
          // (they're already added optimistically on send)
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [
              ...prev,
              {
                id: row.id,
                conversationId: row.conversationId,
                senderId: row.senderId,
                body: row.body,
                createdAt: row.createdAt,
              },
            ];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "matches",
          filter: `id=eq.${matchId}`,
        },
        () => {
          // The other user unmatched or deleted the chat: the match is gone.
          // Leave the conversation instead of showing a dead chat.
          handleMatchDeleted();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "blocks",
          filter: `toId=eq.${currentUserId}`,
        },
        () => {
          // The current user was just blocked: the match stays in the DB but
          // is filtered out of the match list, so leave the chat.
          handleMatchDeleted();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "users",
          filter: `id=eq.${otherUser.id}`,
        },
        (payload) => {
          // The other user was just banned: leave the chat.
          const row = payload.new as { bannedAt: string | null };
          if (row.bannedAt) {
            handleMatchDeleted();
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, matchId, currentUserId]);

  function handleMatchDeleted() {
    channelRef.current?.unsubscribe();
    router.push("/matches");
  }

  function handleBlockSuccess() {
    channelRef.current?.unsubscribe();
    router.push("/matches");
  }

  function handleUnmatchSuccess() {
    channelRef.current?.unsubscribe();
    router.push("/matches");
  }

  function handleSend() {
    const trimmed = inputValue.trim();
    if (!trimmed || isPending) return;

    setInputValue("");
    setSendError(null);

    startTransition(async () => {
      try {
        const created = await sendMessageAction(conversationId, trimmed);
        setMessages((prev) => {
          if (prev.some((m) => m.id === created.id)) return prev;
          return [...prev, created];
        });
      } catch {
        setSendError("Failed to send. Please try again.");
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-background">
        <Link href="/matches" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Back to matches">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>

        {otherUser.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={otherUser.photoUrl}
            alt={otherUser.name}
            className="w-9 h-9 rounded-full object-cover"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold">
            {otherUser.name.charAt(0).toUpperCase()}
          </div>
        )}

        <span className="font-semibold flex-1">{otherUser.name}</span>

        {/* Three-dot menu */}
        <div className="relative">
          <button
            type="button"
            aria-label="More options"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((prev) => !prev)}
            className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 min-w-[120px] rounded-md border bg-background shadow-md py-1">
              <button
                type="button"
                className="w-full text-left px-4 py-2 text-sm hover:bg-accent transition-colors"
                onClick={() => { setMenuOpen(false); setReportOpen(true); }}
              >
                Report
              </button>
              <button
                type="button"
                className="w-full text-left px-4 py-2 text-sm hover:bg-accent transition-colors"
                onClick={() => { setMenuOpen(false); setUnmatchOpen(true); }}
              >
                Unmatch
              </button>
              <button
                type="button"
                className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-accent transition-colors"
                onClick={() => { setMenuOpen(false); setBlockOpen(true); }}
              >
                Block
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Message list */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">
            Say hello to {otherUser.name}!
          </p>
        )}

        {messages.map((msg) => {
          const isMine = msg.senderId === currentUserId;
          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                  isMine
                    ? "bg-brand-600 text-white rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                <p className={`text-xs mt-1 ${isMine ? "text-brand-100" : "text-muted-foreground"}`}>
                  {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t bg-background px-4 py-3">
        {sendError && (
          <p className="text-xs text-red-500 mb-2">{sendError}</p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            rows={1}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            disabled={isPending}
            className="flex-1 resize-none rounded-2xl border bg-muted px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 disabled:opacity-50 max-h-32"
            style={{ minHeight: "2.5rem" }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={isPending || !inputValue.trim()}
            aria-label="Send message"
            className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center disabled:opacity-40 transition-opacity"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Moderation modals */}
      <ReportModal
        targetUserId={otherUser.id}
        open={reportOpen}
        onOpenChange={setReportOpen}
      />
      <BlockConfirmDialog
        targetUserId={otherUser.id}
        targetUserName={otherUser.name}
        open={blockOpen}
        onOpenChange={setBlockOpen}
        onBlocked={handleBlockSuccess}
      />
      <UnmatchConfirmDialog
        matchId={matchId}
        targetUserName={otherUser.name}
        open={unmatchOpen}
        onOpenChange={setUnmatchOpen}
        onUnmatched={handleUnmatchSuccess}
      />
    </>
  );
}
