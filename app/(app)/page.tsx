"use client";

import { Heading, Stack, Text } from "@chakra-ui/react";

export default function DashboardPage() {
  return (
    <Stack gap="2" padding="6">
      <Heading size="lg">Dashboard</Heading>
      <Text color="fg.muted">CISv3 beta — shell is wired up.</Text>
    </Stack>
  );
}
