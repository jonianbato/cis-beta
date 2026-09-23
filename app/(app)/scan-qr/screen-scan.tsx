"use client";

import type { RefObject } from "react";
import { Box, Flex, Text, chakra } from "@chakra-ui/react";
import { Camera } from "lucide-react";
import { cameraMessage, type CameraState } from "@/lib/use-code-scanner";
import { C, MONO } from "./theme";
import { ErrorNote, Panel, TickBadge } from "./chrome";

/** One corner of the viewfinder bracket. */
function Corner({
  vertical,
  horizontal,
}: {
  vertical: "top" | "bottom";
  horizontal: "left" | "right";
}) {
  const radius =
    vertical === "top"
      ? horizontal === "left"
        ? "8px 0 0 0"
        : "0 8px 0 0"
      : horizontal === "left"
        ? "0 0 0 8px"
        : "0 0 8px 0";
  return (
    <Box
      position="absolute"
      w="28px"
      h="28px"
      borderRadius={radius}
      {...{ [vertical]: 0, [horizontal]: 0 }}
      {...{
        [vertical === "top" ? "borderTop" : "borderBottom"]: `4px solid ${C.greenBright}`,
        [horizontal === "left" ? "borderLeft" : "borderRight"]: `4px solid ${C.greenBright}`,
      }}
    />
  );
}

/**
 * The shared scan screen. Every one of the seven scanning steps renders this —
 * only the hint, the samples and the validation behind `onCode` differ, so the
 * operator sees the same viewfinder wherever they are in the flow.
 */
export function ScanScreen({
  hint,
  videoRef,
  camera,
  scannedCode,
  scannedLabel,
  error,
  manual,
  placeholder,
  samples,
  onManualChange,
  onSubmitManual,
  onUseSample,
}: {
  hint: string;
  videoRef: RefObject<HTMLVideoElement | null>;
  camera: CameraState;
  /** Empty until a code passes this step's checks. */
  scannedCode: string;
  scannedLabel: string;
  error: string;
  manual: string;
  placeholder: string;
  samples: string[];
  onManualChange: (value: string) => void;
  onSubmitManual: () => void;
  onUseSample: (code: string) => void;
}) {
  return (
    <>
      <Text fontSize="12.5px" color={C.muted} textAlign="center" lineHeight="1.5">
        {hint}
      </Text>

      <Box
        position="relative"
        w="full"
        maxW="300px"
        mx="auto"
        aspectRatio="1 / 1"
        borderRadius="18px"
        overflow="hidden"
        bg={C.ink}>
        <chakra.video
          ref={videoRef}
          muted
          playsInline
          w="full"
          h="full"
          objectFit="cover"
          display={camera === "on" ? "block" : "none"}
        />

        {camera !== "on" && (
          <Flex
            position="absolute"
            inset="0"
            direction="column"
            align="center"
            justify="center"
            gap="8px"
            color={C.mint}
            p="24px"
            textAlign="center">
            <Camera size={34} strokeWidth={1.6} />
            <Text fontSize="12px" fontWeight={700}>
              {cameraMessage(camera)}
            </Text>
          </Flex>
        )}

        <Box position="absolute" inset="14%" pointerEvents="none">
          <Corner vertical="top" horizontal="left" />
          <Corner vertical="top" horizontal="right" />
          <Corner vertical="bottom" horizontal="left" />
          <Corner vertical="bottom" horizontal="right" />
          <Box
            data-osp-scanline=""
            position="absolute"
            left="6%"
            right="6%"
            h="2px"
            bg={C.greenBright}
            boxShadow={`0 0 12px ${C.greenBright}`}
            animation="osp-scanline 2.4s ease-in-out infinite"
          />
        </Box>
      </Box>

      {scannedCode && (
        <>
          <Box
            borderRadius="14px"
            bg={C.green}
            color={C.surface}
            textAlign="center"
            p="12px">
            <Text fontSize="12px" fontWeight={700} opacity={0.9}>
              {scannedLabel}
            </Text>
            <Text fontSize="18px" fontWeight={800} fontFamily={MONO} mt="2px">
              {scannedCode}
            </Text>
          </Box>
          <Flex
            align="center"
            justify="center"
            gap="7px"
            fontSize="12px"
            fontWeight={700}
            color={C.greenDeep}>
            <TickBadge size={16} />
            QR scanned successfully
          </Flex>
        </>
      )}

      {error && <ErrorNote>{error}</ErrorNote>}

      <Panel p="12px" display="flex" flexDirection="column" gap="8px">
        <chakra.label
          htmlFor="scan-manual-code"
          fontSize="11px"
          fontWeight={800}
          color={C.faint}>
          Can&apos;t scan? Enter the code
        </chakra.label>

        <Flex gap="8px">
          <chakra.input
            id="scan-manual-code"
            value={manual}
            onChange={(event) => onManualChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onSubmitManual();
            }}
            placeholder={placeholder}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            flex="1"
            minW="0"
            h="44px"
            px="12px"
            fontSize="14px"
            fontWeight={700}
            fontFamily={MONO}
            color={C.ink}
            border="1.5px solid"
            borderColor={C.field}
            borderRadius="10px"
            outline="none"
            textTransform="uppercase"
            _focusVisible={{ borderColor: C.green }}
          />
          <chakra.button
            type="button"
            onClick={onSubmitManual}
            h="44px"
            px="16px"
            borderRadius="10px"
            border="1.5px solid"
            borderColor={C.mint}
            display="flex"
            alignItems="center"
            fontSize="13px"
            fontWeight={800}
            color={C.greenDeep}
            cursor="pointer"
            _hover={{ bg: C.tint }}>
            Enter
          </chakra.button>
        </Flex>

        <Flex gap="6px" wrap="wrap" align="center">
          <Text fontSize="10.5px" color={C.fainter}>
            Samples:
          </Text>
          {samples.map((code) => (
            <chakra.button
              key={code}
              type="button"
              onClick={() => onUseSample(code)}
              fontSize="10.5px"
              fontWeight={700}
              color={C.greenDeep}
              bg={C.tint}
              border="1px solid"
              borderColor={C.tintLine}
              borderRadius="20px"
              px="9px"
              py="3px"
              cursor="pointer"
              fontFamily={MONO}>
              {code}
            </chakra.button>
          ))}
        </Flex>
      </Panel>
    </>
  );
}
