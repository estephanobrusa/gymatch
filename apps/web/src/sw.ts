import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope & typeof globalThis;

// Minimal local types for Push and Notification APIs (WebWorker lib not in tsconfig)
type PushEventData = { json: () => { title: string; body: string; url?: string } };
type PushEventLike = Event & { data: PushEventData | null; waitUntil(p: Promise<unknown>): void };
type NotificationLike = { close(): void; data: { url: string } };
type NotificationEventLike = Event & {
  notification: NotificationLike;
  waitUntil(p: Promise<unknown>): void;
};
type ClientLike = { url: string; focus(): Promise<ClientLike> };
type ClientsLike = {
  matchAll(opts: { type: string; includeUncontrolled: boolean }): Promise<ClientLike[]>;
  openWindow(url: string): Promise<ClientLike | null>;
};
type ServiceWorkerRegistrationLike = {
  showNotification(title: string, opts: NotificationOptions): Promise<void>;
};
type ServiceWorkerSelfLike = {
  registration: ServiceWorkerRegistrationLike;
  clients: ClientsLike;
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST ?? [],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

// Push event — show a notification when the server sends a push message
(self as unknown as EventTarget).addEventListener("push", (rawEvent: Event) => {
  const event = rawEvent as unknown as PushEventLike;
  if (!event.data) return;
  const data = event.data.json();
  const { registration } = self as unknown as ServiceWorkerSelfLike;
  event.waitUntil(
    registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url ?? "/" },
    })
  );
});

// Notification click — focus an existing window or open a new one
(self as unknown as EventTarget).addEventListener(
  "notificationclick",
  (rawEvent: Event) => {
    const event = rawEvent as unknown as NotificationEventLike;
    event.notification.close();
    const url = event.notification.data.url;
    const { clients } = self as unknown as ServiceWorkerSelfLike;
    event.waitUntil(
      clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
        const existing = list.find((c) => c.url.includes(url));
        if (existing) return existing.focus();
        return clients.openWindow(url);
      })
    );
  }
);

serwist.addEventListeners();
