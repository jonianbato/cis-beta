"use client";

import type { ChangeEvent, ReactNode } from "react";
import Image from "next/image";
import { Box, Flex, Grid, Text, chakra } from "@chakra-ui/react";
import { Camera, ImageUp, QrCode, User } from "lucide-react";
import { C } from "./theme";
import { ConfirmedStrip, Panel, Segmented } from "./chrome";

const PHOTO_STEPS = [
  "Frame the deceased's face inside the corners.",
  "Hold the toe tag beside the face — do not attach it yet.",
  "Keep the QR flat and in focus, then capture.",
];

/** A file picker dressed as a tile. Native input, so capture= still works. */
function PickerTile({
  label,
  icon,
  capture,
  onPick,
}: {
  label: string;
  icon: ReactNode;
  /** Asks the phone for the rear camera rather than the gallery. */
  capture?: boolean;
  onPick: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <chakra.label
      h="64px"
      borderRadius="12px"
      border="1.5px solid"
      borderColor={C.mint}
      bg={C.surface}
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      gap="4px"
      fontSize="12px"
      fontWeight={800}
      color={C.greenDeep}
      cursor="pointer"
      _hover={{ bg: C.tintBg }}>
      {icon}
      {label}
      <chakra.input
        type="file"
        accept="image/*"
        capture={capture ? "environment" : undefined}
        onChange={onPick}
        display="none"
      />
    </chakra.label>
  );
}

/**
 * The photo that goes on the record. For a retrieval that is the toe tag held
 * beside the deceased before it is attached; after embalming it is the deceased
 * in the casket. The sample card is only shown for the retrieval case.
 */
export function PhotoScreen({
  hint,
  rule,
  showSample,
  photoUrl,
  onPick,
}: {
  hint: string;
  rule: string;
  showSample: boolean;
  photoUrl: string;
  onPick: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <>
      <Text fontSize="12.5px" color={C.muted} textAlign="center" lineHeight="1.5">
        {hint}
      </Text>

      {showSample && (
        <Panel overflow="hidden" bg={C.surface}>
          <Flex
            px="12px"
            py="8px"
            bg={C.tintBg}
            borderBottom="1px solid"
            borderColor={C.lineSoft}
            align="center"
            justify="space-between"
            gap="8px">
            <Text fontSize="11px" fontWeight={800} color={C.ink}>
              How to take the photo
            </Text>
            <Text fontSize="10px" fontWeight={700} color={C.sage}>
              Sample
            </Text>
          </Flex>
          <Image
            src="/images/sample-toetag-photo.png"
            alt="Sample: deceased with toe tag held beside, tag not yet attached"
            width={449}
            height={363}
            style={{
              display: "block",
              width: "100%",
              height: "auto",
              maxHeight: "220px",
              objectFit: "contain",
              background: C.surface,
            }}
          />
          <Box
            display="flex"
            flexDirection="column"
            gap="5px"
            px="12px"
            pt="10px"
            pb="12px"
            borderTop="1px solid"
            borderColor={C.lineFaint}>
            {PHOTO_STEPS.map((text, index) => (
              <Flex key={text} align="flex-start" gap="8px">
                <Flex
                  w="18px"
                  h="18px"
                  borderRadius="50%"
                  bg={C.green}
                  color={C.onFill}
                  fontSize="10px"
                  fontWeight={800}
                  align="center"
                  justify="center"
                  flexShrink={0}>
                  {index + 1}
                </Flex>
                <Text fontSize="12px" color={C.inkSoft} lineHeight="1.4">
                  {text}
                </Text>
              </Flex>
            ))}
          </Box>
        </Panel>
      )}

      <Flex
        align="flex-start"
        gap="10px"
        bg={C.amberBg}
        border="1px solid"
        borderColor={C.amberLine}
        borderRadius="12px"
        px="12px"
        py="10px">
        <Box flexShrink={0} mt="1px">
          <QrCode size={18} color={C.amberIcon} strokeWidth={1.8} />
        </Box>
        <Text fontSize="12px" fontWeight={700} color={C.amberInk} lineHeight="1.45">
          {rule}
        </Text>
      </Flex>

      <Flex
        w="full"
        maxW="260px"
        mx="auto"
        aspectRatio="4 / 5"
        borderRadius="16px"
        border="1.5px dashed"
        borderColor={C.mint}
        bg={C.tintBg}
        overflow="hidden"
        align="center"
        justify="center">
        {photoUrl ? (
          <Box
            w="full"
            h="full"
            backgroundImage={`url("${photoUrl}")`}
            backgroundSize="cover"
            backgroundPosition="center"
          />
        ) : (
          <Flex direction="column" align="center" gap="6px" color={C.faint}>
            <User size={36} color={C.fainter} strokeWidth={1.6} />
            <Text fontSize="12px" fontWeight={700}>
              No photo yet
            </Text>
          </Flex>
        )}
      </Flex>

      <Grid templateColumns="1fr 1fr" gap="10px">
        <PickerTile
          label="Take photo"
          capture
          onPick={onPick}
          icon={<Camera size={20} color={C.green} strokeWidth={1.8} />}
        />
        <PickerTile
          label="Upload"
          onPick={onPick}
          icon={<ImageUp size={20} color={C.green} strokeWidth={1.8} />}
        />
      </Grid>
    </>
  );
}

/** Confirming the deceased is dressed and in the casket the contract names. */
export function CasketScreen({
  model,
  casketTag,
  placed,
  onPlacedChange,
}: {
  model: string;
  casketTag: string;
  placed: string;
  onPlacedChange: (next: string) => void;
}) {
  return (
    <>
      <Panel px="14px" py="12px">
        <Text fontSize="10.5px" fontWeight={700} color={C.fainter}>
          Casket per contract
        </Text>
        <Text fontSize="15px" fontWeight={800} color={C.ink} mt="2px">
          {model}
        </Text>
      </Panel>

      <ConfirmedStrip label="Casket barcode scanned" value={casketTag} />

      <Box>
        <Text fontSize="11.5px" fontWeight={700} color={C.faint} mb="6px">
          Deceased dressed and placed in casket
        </Text>
        <Segmented
          options={["Yes", "No"]}
          value={placed}
          onChange={onPlacedChange}
        />
      </Box>
    </>
  );
}
