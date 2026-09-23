"use client";

import type { ReactNode } from "react";
import { AppLayout } from "osp-ui-kit";
import { navItems } from "./nav-items";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <AppLayout
      appName="One St. Peter"
      appSubtitle="Chapel Operations"
      navItems={navItems}>
      {children}
    </AppLayout>
  );
}
