import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in — St. Peter Life Plan",
  description: "CISv3 beta",
};

/**
 * Auth-area layout. It deliberately adds no chrome: <html>/<body> and the
 * design-system providers all come from the root layout, and login stays
 * outside the app shell by living in its own route group.
 */
export default function LoginLayout({ children }: LayoutProps<"/login">) {
  return <>{children}</>;
}
