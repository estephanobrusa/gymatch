"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import type { MatchPreview } from "@/lib/chat/types";

interface Props {
  matches: MatchPreview[];
}

export function MatchesList({ matches }: Props) {
  return (
    <>
      {matches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
          <p className="text-lg font-medium">No matches yet</p>
          <p className="text-sm mt-1">Keep swiping to find your gym partner!</p>
          <Link
            href="/"
            className="mt-6 px-6 py-2 rounded-full bg-brand-600 text-white font-semibold text-sm"
          >
            Discover people
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {matches.map((match) => (
            <li key={match.conversationId} className="relative">
              <Link
                href={`/matches/${match.conversationId}`}
                className="flex items-center gap-4 p-4 rounded-2xl hover:bg-muted transition-colors"
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {match.matchedUser.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={match.matchedUser.photoUrl}
                      alt={match.matchedUser.name}
                      className="w-14 h-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-xl">
                      {match.matchedUser.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {match.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-brand-600 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                      {match.unreadCount > 9 ? "9+" : match.unreadCount}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between">
                    <span className="font-semibold truncate">{match.matchedUser.name}</span>
                    {match.lastMessage && (
                      <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                        {formatDistanceToNow(new Date(match.lastMessage.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate mt-0.5">
                    {match.lastMessage ? match.lastMessage.body : "Start the conversation!"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
