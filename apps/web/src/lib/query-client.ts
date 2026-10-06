import { QueryClient } from "@tanstack/react-query";

let queryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (typeof window === "undefined") {
    // Server: always create a new QueryClient.
    // Each server render/request runs in its own module scope, so a shared
    // client would leak cached data between unrelated requests (and users).
    // A fresh, short-lived client per request keeps server rendering stateless.
    return new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000,
        },
      },
    });
  }

  // Browser: reuse singleton.
  // The browser tab is a single long-lived session, so one shared client lets
  // TanStack Query cache data across route changes and components instead of
  // refetching on every navigation.
  if (!queryClient) {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000,
        },
      },
    });
  }

  return queryClient;
}
