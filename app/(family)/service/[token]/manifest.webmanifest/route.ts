import { serviceLink } from "@/app/(app)/scanner/data";

/**
 * The web app manifest for one family's service link.
 *
 * Each link installs as its own app: the start URL, scope and id are the link
 * itself, so the home-screen icon always reopens this service and never the
 * staff app, whose manifest (app/manifest.ts) covers the rest of the site.
 * An unknown token is a 404, as the page is.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/service/[token]/manifest.webmanifest">,
) {
  const { token } = await params;
  if (!serviceLink(token)) return new Response("Not found", { status: 404 });

  const base = `/service/${token}`;
  const manifest = {
    id: base,
    name: "St. Peter — Family Service Link",
    short_name: "St. Peter",
    description: "Follow and authorize your loved one's service with St. Peter.",
    start_url: base,
    scope: base,
    display: "standalone",
    orientation: "portrait",
    background_color: "#f3f8f5",
    theme_color: "#15803d",
    icons: [
      { src: "/icons/family/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/family/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/family/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/family/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };

  return new Response(JSON.stringify(manifest), {
    headers: {
      "Content-Type": "application/manifest+json",
      // A link's manifest only changes with a deploy.
      "Cache-Control": "public, max-age=3600",
    },
  });
}
