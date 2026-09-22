"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StPeterProvider } from "st-peter-ui";
import { ColorModeProvider, MessageDialogProvider } from "osp-ui-kit";
import NextNavigationProvider from "./next-navigation-provider";

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
