import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { serviceLink } from "@/app/(app)/scanner/data";
import { tagConfirmedHere } from "./actions";
import { FamilyProvider } from "./family-context";

/**
 * Each link installs as its own app, so its pages point at the link's own
 * manifest and icons rather than the staff app's.
 */
export async function generateMetadata({
  params,
}: LayoutProps<"/service/[token]">): Promise<Metadata> {
  const { token } = await params;
  return {
    manifest: `/service/${token}/manifest.webmanifest`,
    appleWebApp: {
      capable: true,
      title: "St. Peter",
      statusBarStyle: "default",
    },
    icons: {
      icon: "/icons/family/icon-192.png",
      apple: "/icons/family/apple-touch-icon.png",
    },
  };
}

// The status bar follows the page's own header in both themes.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#13221b" },
  ],
  viewportFit: "cover",
};

/**
 * The service link sent to the family, and every section under it. An unknown
 * token is a plain 404, so the page never confirms that a service exists to
 * someone without its link. The session lives here, so moving between the
 * sections keeps it.
 */
export default async function ServiceLinkLayout({
  params,
  children,
}: LayoutProps<"/service/[token]">) {
  const { token } = await params;
  if (!serviceLink(token)) notFound();
  return (
    <FamilyProvider token={token} returning={await tagConfirmedHere(token)}>
      {children}
    </FamilyProvider>
  );
}
