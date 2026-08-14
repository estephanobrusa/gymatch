"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { unblockUserAction } from "@/lib/moderation/actions";
import type { BlockedUserItem } from "@/lib/moderation/queries";

export function BlockedUsersList({ users }: { users: BlockedUserItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (users.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No blocked users.
      </p>
    );
  }

  function handleUnblock(id: string) {
    startTransition(async () => {
      await unblockUserAction(id);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {users.map((user) => (
        <div key={user.id} className="flex items-center gap-3 py-3">
          {user.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.photoUrl}
              alt={user.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              @{user.username ?? "unknown"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleUnblock(user.id)}
            disabled={pending}
            className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:border-brand-500 hover:text-brand-500 disabled:opacity-50 transition-colors"
          >
            Unblock
          </button>
        </div>
      ))}
    </div>
  );
}
