"use client";

import type { ReactNode } from "react";
import { AppLayout } from "osp-ui-kit";
import { navItems } from "./nav-items";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <AppLayout
      appName="St. Peter Life Plan"
      appSubtitle="Online Service Portal"
      navItems={navItems}
    >
      {children}
    </AppLayout>
  );
}
