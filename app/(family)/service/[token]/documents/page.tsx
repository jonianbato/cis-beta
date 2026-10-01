"use client";

import { SectionPage } from "../section-page";
import { DocumentsCard } from "../service-home";

/** The same documents as the service home, on a page of their own. */
export default function Page() {
  return (
    <SectionPage title="Documents" description="Required for this service">
      <DocumentsCard />
    </SectionPage>
  );
}
