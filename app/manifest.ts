import type { MetadataRoute } from "next";

/**
 * Web app manifest — what makes the app installable.
 *
 * Next serves this at /manifest.webmanifest and links it from every page, so
 * there is no <link rel="manifest"> to maintain by hand.
 *
 * Icons and screenshots are the same assets the current CIS app installs with
 * (copied from ../cisv3/public), so an install of this build carries the
 * familiar Chapel mark.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "One St. Peter — Chapel Operations",
    short_name: "1SP-CIS",
    description: "Chapel operations for St. Peter Life Plan.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    // Matches the kit's primaryGreen, which is what the app header paints.
    theme_color: "#109448",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    // Chrome on Android shows these in the richer install dialog.
    screenshots: [
      {
        src: "/screenshots/mobile.png",
        sizes: "390x844",
        type: "image/png",
      },
      {
        src: "/screenshots/desktop.png",
        sizes: "1280x720",
        type: "image/png",
        form_factor: "wide",
      },
    ],
    shortcuts: [
      {
        name: "Scan QR",
        short_name: "Scan",
        url: "/scan-qr",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
