"use client";

import { Heading, Stack, Text } from "@chakra-ui/react";
import { DashboardHeaderMobile } from "osp-ui-kit";

export default function DashboardPage() {
  return (
    <>
      {/* Mobile-only: the kit hides this from lg up, where the app header
          and sidebar already carry the branding. */}
      <DashboardHeaderMobile
        title={"One St. Peter"}
        subtitle={"Chapel Operations"}
      />
      <Stack gap="2" padding="6">
        <Heading size="lg">Dashboard</Heading>
        <Text color="fg.muted">CISv3 beta — shell is wired up.</Text>
      </Stack>
    </>
  );
}
