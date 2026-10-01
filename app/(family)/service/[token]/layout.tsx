import { notFound } from "next/navigation";
import { serviceLink } from "@/app/(app)/scanner/data";
import { FamilyProvider } from "./family-context";

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
  return <FamilyProvider token={token}>{children}</FamilyProvider>;
}
