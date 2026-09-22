import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import AppShell from "./app-shell";

export const metadata: Metadata = {
  title: "St. Peter Life Plan — Online Service Portal",
  description: "CISv3 beta",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
