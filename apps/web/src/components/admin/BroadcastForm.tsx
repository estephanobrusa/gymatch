"use client";

import { useState } from "react";
import { broadcastPushAction } from "@/lib/push/broadcast";

export function BroadcastForm({ reachableUsers }: { reachableUsers: number }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    const res = await broadcastPushAction({ title, body, url });

    setLoading(false);
    if ("error" in res) {
      setError(res.error);
    } else {
      setResult(`Sent to ${res.sent} user${res.sent !== 1 ? "s" : ""}.`);
      setTitle("");
      setBody("");
      setUrl("/");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="push-title" className="text-sm font-medium">
          Title
        </label>
        <input
          id="push-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New event near you 🏋️"
          maxLength={80}
          required
          className="rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="push-body" className="text-sm font-medium">
          Body
        </label>
        <textarea
          id="push-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Check out the open mat this Saturday at Gold's Gym Palermo."
          maxLength={200}
          rows={3}
          required
          className="rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 resize-none"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="push-url" className="text-sm font-medium">
          URL on click
        </label>
        <input
          id="push-url"
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="/events"
          className="rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {result && <p className="text-sm text-emerald-600 font-medium">{result}</p>}

      <button
        type="submit"
        disabled={loading || reachableUsers === 0}
        className="py-2.5 rounded-full bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors"
      >
        {loading
          ? "Sending…"
          : reachableUsers === 0
          ? "No subscribers yet"
          : `Send to ${reachableUsers} users`}
      </button>
    </form>
  );
}
