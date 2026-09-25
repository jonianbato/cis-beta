"use client";

import { Box, Flex, Text, chakra } from "@chakra-ui/react";
import { Barcode, ChevronRight, ScanQrCode, ShieldCheck } from "lucide-react";
import { C } from "./theme";
import { Panel } from "./chrome";

export type LogEntry = { text: string; tone: "good" | "bad"; at: string };

type HomeCard = {
  title: string;
  sub: string;
  state: string;
  good: boolean;
  icon: typeof ScanQrCode;
  onOpen: () => void;
};

/**
 * The two ways into the flow, plus what this operator has done today.
 *
 * Processing is the full run, where the scanned service decides its own next
 * step. Matching is a spot check that answers one question — are these two
 * documents the same deceased. Casket lookup is read-only: it answers who is in
 * a casket and where they lie in state.
 */
export function HomeScreen({
  matchedServices,
  hasEmbalmed,
  log,
  onOpenMatching,
  onOpenProcess,
  onOpenLookup,
}: {
  matchedServices: number;
  hasEmbalmed: boolean;
  log: LogEntry[];
  onOpenMatching: () => void;
  onOpenProcess: () => void;
  onOpenLookup: () => void;
}) {
  const cards: HomeCard[] = [
    {
      title: "Scan QR to Process",
      sub: "Retrieval, outside viewing or embalming · step by step",
      state: "System shows the next step to authorize",
      good: hasEmbalmed,
      icon: ShieldCheck,
      onOpen: onOpenProcess,
    },
    {
      title: "QR Matching",
      sub: "Scan any two QRs to confirm same deceased",
      state: matchedServices
        ? `${matchedServices} service(s) matched today`
        : "Scan first QR, then second QR",
      good: matchedServices > 0,
      icon: ScanQrCode,
      onOpen: onOpenMatching,
    },
    {
      title: "Casket Lookup",
      sub: "Scan a casket barcode · deceased and room details",
      state: "View only · no authorization needed",
      good: false,
      icon: Barcode,
      onOpen: onOpenLookup,
    },
  ];

  return (
    <>
      {cards.map((card) => (
        <chakra.button
          key={card.title}
          type="button"
          onClick={card.onOpen}
          display="flex"
          alignItems="center"
          gap="12px"
          p="14px"
          border="1px solid"
          borderColor={C.line}
          borderRadius="16px"
          bg={C.surface}
          cursor="pointer"
          textAlign="left"
          _hover={{ borderColor: C.tintLine }}>
          <Flex
            w="44px"
            h="44px"
            borderRadius="12px"
            bg={C.tint}
            align="center"
            justify="center"
            flexShrink={0}>
            <card.icon size={22} color={C.green} strokeWidth={1.8} />
          </Flex>

          <Box flex="1" minW="0">
            <Text fontSize="14px" fontWeight={800} color={C.ink}>
              {card.title}
            </Text>
            <Text fontSize="11.5px" color={C.sage} mt="2px">
              {card.sub}
            </Text>
            <Text
              display="inline-flex"
              mt="7px"
              fontSize="10.5px"
              fontWeight={800}
              borderRadius="20px"
              px="9px"
              py="3px"
              border="1px solid"
              bg={card.good ? C.tint : C.lineFaint}
              color={card.good ? C.greenDeep : "#6b7c73"}
              borderColor={card.good ? C.tintLine : C.line}>
              {card.state}
            </Text>
          </Box>

          <ChevronRight
            size={16}
            color={C.fainter}
            strokeWidth={2}
            style={{ flexShrink: 0 }}
          />
        </chakra.button>
      ))}

      {log.length > 0 && (
        <Panel overflow="hidden">
          <Box
            px="14px"
            py="10px"
            bg={C.tintBg}
            borderBottom="1px solid"
            borderColor={C.lineSoft}
            fontSize="12px"
            fontWeight={800}
            color={C.ink}>
            Today&apos;s activity
          </Box>
          {log.map((entry, index) => (
            <Flex
              key={`${entry.at}-${index}`}
              align="flex-start"
              gap="10px"
              px="14px"
              py="10px"
              borderBottom={index === log.length - 1 ? undefined : "1px solid"}
              borderColor={C.lineFaint}>
              <Box
                w="8px"
                h="8px"
                borderRadius="50%"
                mt="5px"
                flexShrink={0}
                bg={entry.tone === "good" ? C.green : C.red}
              />
              <Box flex="1" minW="0">
                <Text fontSize="12.5px" fontWeight={700} color={C.inkSoft}>
                  {entry.text}
                </Text>
                <Text fontSize="10.5px" color={C.fainter} mt="2px">
                  {entry.at}
                </Text>
              </Box>
            </Flex>
          ))}
        </Panel>
      )}
    </>
  );
}
