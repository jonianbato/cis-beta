"use client";

/**
 * SPA variant: the react-router stack as documented for osp-ui-kit's Vite
 * hosts. Unused by default — `providers.tsx` mounts `provider-stack.tsx`
 * (Next App Router) instead. Swap the import there to use this, and note that
 * it needs `next/dynamic` with `ssr: false`, because BrowserRouter builds its
 * history from `window` during render. Routing then becomes react-router's
 * job, so the pages under app/ stop being reachable and you declare <Routes>
 * in here instead.
 */

import type { ReactNode } from "react";
import { useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StPeterProvider } from "st-peter-ui";
import {
  ColorModeProvider,
  MessageDialogProvider,
  ReactRouterNavigationProvider,
} from "osp-ui-kit";

export default function ProviderStackSpa({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <StPeterProvider font="Open Sans" theme="green">
      <ColorModeProvider>
        <QueryClientProvider client={queryClient}>
          <MessageDialogProvider>
            <BrowserRouter>
              <ReactRouterNavigationProvider>
                {children}
              </ReactRouterNavigationProvider>
            </BrowserRouter>
          </MessageDialogProvider>
        </QueryClientProvider>
      </ColorModeProvider>
    </StPeterProvider>
  );
}
