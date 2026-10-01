"use client";

import type { ReactNode } from "react";
import { Text } from "@chakra-ui/react";
import { Page } from "osp-ui-kit";
import { FamilyPage } from "./service-home";
import { P } from "./family-ui";

/**
 * One section of the family's service link, under the kit's page header. A
 * section with nothing of its own yet says so rather than showing an empty page.
 */
export function SectionPage({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <Page.Root title={title} description={description} headerButton="menu">
      <Page.MainContent>
        <Page.Row>
          <FamilyPage>
            {children ?? (
              <Text fontSize="14px" lineHeight="1.55" color={P.muted}>
                This section isn&apos;t available yet.
              </Text>
            )}
          </FamilyPage>
        </Page.Row>
      </Page.MainContent>
    </Page.Root>
  );
}
