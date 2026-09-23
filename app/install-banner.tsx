"use client";

import Image from "next/image";
import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import { PrimarySmButton, TertiarySmIconButton } from "osp-ui-kit";
import { Share, X } from "lucide-react";
import { useInstallPrompt } from "@/lib/use-install-prompt";

/**
 * Offers the app for install, inline above the page content.
 *
 * It renders nothing unless the browser has actually offered an install —
 * already-installed, dismissed, and unsupported all collapse to null — so it
 * costs nothing on the pages it sits above.
 */
export default function InstallBanner() {
  const { canShow, needsIosInstructions, install, dismiss } = useInstallPrompt();

  if (!canShow) return null;

  return (
    <Box
      role="region"
      aria-label="Install this app"
      m="4"
      p="4"
      borderWidth="1px"
      borderColor="border"
      borderRadius="l2"
      bg="bg.subtle">
      <Flex gap="4" align="flex-start">
        <Image
          src="/icons/icon-192.png"
          alt=""
          width={40}
          height={40}
          style={{ borderRadius: 8, flexShrink: 0 }}
        />

        <Stack gap="1" flex="1" minW="0">
          <Text fontWeight="semibold">Install One St. Peter</Text>
          {needsIosInstructions ? (
            <Text fontSize="sm" color="fg.muted">
              Tap the Share button{" "}
              <Box as="span" display="inline-flex" verticalAlign="text-bottom">
                <Share size={14} aria-label="Share" />
              </Box>{" "}
              in Safari, then choose &ldquo;Add to Home Screen&rdquo;.
            </Text>
          ) : (
            <Text fontSize="sm" color="fg.muted">
              Add it to this device for a full-screen app that opens straight
              from your home screen.
            </Text>
          )}

          {!needsIosInstructions && (
            <Box pt="2">
              <PrimarySmButton onClick={install}>Install</PrimarySmButton>
            </Box>
          )}
        </Stack>

        <TertiarySmIconButton aria-label="Dismiss" onClick={dismiss}>
          <X size={16} />
        </TertiarySmIconButton>
      </Flex>
    </Box>
  );
}
