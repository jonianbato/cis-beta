"use client";

import { useRef, type PointerEvent, type ReactNode, type RefObject } from "react";
import { Box, Flex, Text, chakra } from "@chakra-ui/react";
import { Camera, Minus, Plus, RotateCcw, ScanQrCode } from "lucide-react";
import {
  cameraMessage,
  canRetryCamera,
  type CameraState,
  type ZoomControl,
} from "@/lib/use-code-scanner";
import { C, MONO } from "./theme";
import { ErrorNote, Panel, TickBadge } from "./chrome";

/** How far one tap of − or + moves the zoom. */
const ZOOM_STEP = 0.5;

/** One round − / + button on the zoom pill. */
function ZoomButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <chakra.button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      w="32px"
      h="32px"
      borderRadius="full"
      display="flex"
      alignItems="center"
      justifyContent="center"
      color={C.onFill}
      cursor="pointer"
      _hover={{ bg: C.veilLine }}
      _disabled={{ opacity: 0.35, cursor: "default", bg: "transparent" }}>
      {children}
    </chakra.button>
  );
}

/**
 * Two-finger pinch on the viewfinder. Tracks the active pointers and scales
 * the zoom by how far apart they have moved since the pinch began.
 */
function usePinchZoom(zoom: ZoomControl | null) {
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const start = useRef<{ distance: number; level: number } | null>(null);

  const spread = () => {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const end = (event: PointerEvent) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) start.current = null;
  };

  return {
    onPointerDown: (event: PointerEvent) => {
      if (event.pointerType !== "touch") return;
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.current.size === 2 && zoom) {
        start.current = { distance: spread(), level: zoom.level };
      }
    },
    onPointerMove: (event: PointerEvent) => {
      if (!pointers.current.has(event.pointerId)) return;
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (start.current && zoom && pointers.current.size === 2) {
        zoom.set(start.current.level * (spread() / start.current.distance));
      }
    },
    onPointerUp: end,
    onPointerCancel: end,
  };
}

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
 *
 * Once a code is accepted the viewfinder gives way to the record it found;
 * "Scan another QR" is the only way back to the camera.
 */
export function ScanScreen({
  hint,
  videoRef,
  camera,
  zoom,
  onRetryCamera,
  onRescan,
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
  /** Present while the camera is live. */
  zoom: ZoomControl | null;
  onRetryCamera: () => void;
  /** Drops the accepted code and brings the viewfinder back. */
  onRescan: () => void;
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
  const pinch = usePinchZoom(zoom);

  if (scannedCode) {
    return (
      <>
        <Box
          borderRadius="14px"
          bg={C.green}
          color={C.onFill}
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
        <chakra.button
          type="button"
          onClick={onRescan}
          h="44px"
          borderRadius="10px"
          border="1.5px solid"
          borderColor={C.mint}
          display="flex"
          alignItems="center"
          justifyContent="center"
          gap="8px"
          fontSize="13px"
          fontWeight={800}
          color={C.greenDeep}
          cursor="pointer"
          _hover={{ bg: C.tint }}>
          <ScanQrCode size={17} strokeWidth={2} />
          Scan another QR
        </chakra.button>
      </>
    );
  }

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
        bg={C.viewfinder}
        // Vertical swipes still scroll the page; two fingers pinch-zoom.
        touchAction="pan-y"
        {...pinch}>
        <chakra.video
          ref={videoRef}
          muted
          playsInline
          w="full"
          h="full"
          objectFit="cover"
          display={camera === "on" ? "block" : "none"}
          // Digital zoom: the hook reads the same centre crop it scales to.
          transform={
            zoom && !zoom.hardware && zoom.level > 1
              ? `scale(${zoom.level})`
              : undefined
          }
          transition="transform 0.12s ease-out"
        />

        {camera !== "on" && (
          <Flex
            position="absolute"
            inset="0"
            direction="column"
            align="center"
            justify="center"
            gap="8px"
            color={C.viewfinderInk}
            p="24px"
            textAlign="center">
            <Camera size={34} strokeWidth={1.6} />
            <Text fontSize="12px" fontWeight={700}>
              {cameraMessage(camera)}
            </Text>
            {canRetryCamera(camera) && (
              <chakra.button
                type="button"
                onClick={onRetryCamera}
                display="flex"
                alignItems="center"
                gap="6px"
                mt="4px"
                px="12px"
                py="6px"
                borderRadius="20px"
                border="1px solid"
                borderColor={C.viewfinderInk}
                color={C.viewfinderInk}
                fontSize="11.5px"
                fontWeight={800}
                cursor="pointer">
                <RotateCcw size={13} strokeWidth={2.2} />
                Try again
              </chakra.button>
            )}
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

        {zoom && (
          <Flex
            position="absolute"
            bottom="10px"
            left="50%"
            transform="translateX(-50%)"
            align="center"
            gap="2px"
            p="3px"
            borderRadius="full"
            bg={C.veil}
            border="1px solid"
            borderColor={C.veilLine}
            backdropFilter="blur(6px)">
            <ZoomButton
              label="Zoom out"
              disabled={zoom.level <= zoom.min}
              onClick={() => zoom.set(zoom.level - ZOOM_STEP)}>
              <Minus size={16} strokeWidth={2.4} />
            </ZoomButton>
            <Text
              aria-live="polite"
              minW="40px"
              textAlign="center"
              fontSize="12px"
              fontWeight={800}
              fontFamily={MONO}
              color={C.onFill}>
              {zoom.level.toFixed(1)}×
            </Text>
            <ZoomButton
              label="Zoom in"
              disabled={zoom.level >= zoom.max}
              onClick={() => zoom.set(zoom.level + ZOOM_STEP)}>
              <Plus size={16} strokeWidth={2.4} />
            </ZoomButton>
          </Flex>
        )}
      </Box>

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

        {samples.length > 0 && (
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
        )}
      </Panel>
    </>
  );
}
