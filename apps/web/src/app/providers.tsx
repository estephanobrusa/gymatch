"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { getQueryClient } from "@/lib/query-client";
import type { ReactNode } from "react";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  // This is the single place where app-wide client-side providers are wired
  // (QueryClientProvider, ThemeProvider, Toaster, ...). See
  // `lib/query-client.ts` for how the QueryClient instance is actually built
  // (server vs. browser behave differently there).
  const queryClient = getQueryClient();

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
