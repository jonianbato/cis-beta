import type { ReactNode } from "react";
import AppShell from "../app-shell";

/** Wraps the signed-in pages in the shell; the auth pages sit outside this group. */
export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
