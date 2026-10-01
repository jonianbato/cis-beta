import type { Metadata } from "next";
import { JetBrains_Mono, Noto_Sans } from "next/font/google";

export const metadata: Metadata = {
  title: "Service Link — St. Peter Life Plan",
  description: "Verify your loved one's toe tag with St. Peter.",
  // A family's link is private to them; it should never turn up in a search.
  robots: { index: false, follow: false },
};

// The family pages carry their own type, apart from the staff app's.
const sans = Noto_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--family-sans",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--family-mono",
});

/**
 * Pages opened from a link sent to the family. They are public, so they sit
 * outside the (app) group and never mount the staff shell, its navigation or
 * its signed-in user. <html>/<body> and the providers come from the root.
 */
export default function FamilyLayout({ children }: LayoutProps<"/">) {
  return (
    <div className={`${sans.variable} ${mono.variable}`}>{children}</div>
  );
}
