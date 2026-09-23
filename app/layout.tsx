import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import Providers from "./providers";
import RegisterServiceWorker from "./register-service-worker";
import { INSTALL_PROMPT_SCRIPT } from "@/lib/install-prompt-script";

export const metadata: Metadata = {
  title: "St. Peter Life Plan — Online Service Portal",
  description: "CISv3 beta",
  // Next links app/manifest.ts automatically; these cover what the manifest
  // cannot — iOS reads the apple-* tags rather than the manifest.
  appleWebApp: {
    capable: true,
    title: "One St. Peter",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  // Paints the phone's status bar and the installed window's title bar.
  themeColor: "#109448",
  // An installed app runs edge to edge; without this the safe areas are unusable.
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {/*
          beforeInteractive puts this in the initial HTML, ahead of any Next
          module — which is the point: Chrome fires beforeinstallprompt once,
          usually before hydration. A plain <script> element here would be
          rendered by React instead, which never executes it on the client.
          See lib/install-prompt-script.ts.
        */}
        <Script
          id="install-prompt-capture"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: INSTALL_PROMPT_SCRIPT }}
        />
        <Providers>{children}</Providers>
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
