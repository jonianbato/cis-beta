"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  ColorModeProvider,
  MessageDialogProvider,
  StPeterProvider,
} from "osp-ui-kit";
import NextNavigationProvider from "./next-navigation-provider";

// The shell is not mounted here: it belongs to the (app) route group, so the
// auth pages render without it. See app/(app)/layout.tsx.
export default function ProviderStack({ children }: { children: ReactNode }) {
  // One client per mount, not per render.
  const [queryClient] = useState(() => new QueryClient());

  return (
    <StPeterProvider font="Open Sans" theme="green">
      <ColorModeProvider>
        <QueryClientProvider client={queryClient}>
          <MessageDialogProvider>
            <NextNavigationProvider>{children}</NextNavigationProvider>
          </MessageDialogProvider>
        </QueryClientProvider>
      </ColorModeProvider>
    </StPeterProvider>
  );
}
