"use client";

import type { ReactNode } from "react";
import { AppLayout, type AppUser } from "osp-ui-kit";
import { navItems } from "./nav-items";

/** Stand-in signed-in user until the shell reads it from the session. */
const DEMO_USER: AppUser = {
  id: "jonab",
  displayName: "Jon-Ian A. Batomalaque",
  email: "jonab@stpeter.com.ph",
  status: "Active",
  avatarUrl:
    "https://lh3.googleusercontent.com/a/ACg8ocKEOnPcszTHoOT1CArlRtH2NaavpXMZ5RLr7W2LdLeN4OiPQPLy=s83-c-mo",
  position: "Chapel - Driver",
};

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <AppLayout
      appName="One St. Peter"
      appSubtitle="Chapel Operations"
      navItems={navItems}
      user={DEMO_USER}>
      {children}
    </AppLayout>
  );
}
