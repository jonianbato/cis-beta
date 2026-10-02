"use client";

import type { ReactNode, RefObject } from "react";
import Image from "next/image";
import { Box, Flex, Text, chakra } from "@chakra-ui/react";
import { RotateCcw, Share, X } from "lucide-react";
import { useInstallPrompt } from "@/lib/use-install-prompt";
import {
  cameraMessage,
  canRetryCamera,
  type CameraState,
} from "@/lib/use-code-scanner";

const v = (name: string) => `var(--family-${name})`;

/**
 * The family pages' palette. Each entry is a CSS variable in app/globals.css:
 * light is the Toe Tag Verification design's, dark is the app layout's green
 * dark theme, swapped by the `dark` class the kit's ColorModeProvider sets.
 */
export const P = {
  page: v("page"),
  surface: v("surface"),
  ink: v("ink"),
  text: v("text"),
  body: v("body"),
  sage: v("sage"),
  muted: v("muted"),
  faint: v("faint"),
  line: v("line"),
  lineSoft: v("line-soft"),
  header: v("header"),
  field: v("field"),
  chip: v("chip"),
  chipLine: v("chip-line"),
  photo: v("photo"),
  dashed: v("dashed"),
  green: v("green"),
  greenHover: v("green-hover"),
  greenDot: v("green-dot"),
  greenBright: v("green-bright"),
  greenDisabled: v("green-disabled"),
  okBg: v("ok-bg"),
  okLine: v("ok-line"),
  okInk: v("ok-ink"),
  warnBg: v("warn-bg"),
  warnInk: v("warn-ink"),
  idleBg: v("idle-bg"),
  ring: v("ring"),
  bar: v("bar"),
  errBg: v("err-bg"),
  errLine: v("err-line"),
  errTitle: v("err-title"),
  errBody: v("err-body"),
  errText: v("err-text"),
  errField: v("err-field"),
  reviewBg: v("review-bg"),
  reviewInk: v("review-ink"),
  scrim: v("scrim"),
  /** Text and glyphs on a green fill, and photo captions — white in both modes. */
  onFill: "#ffffff",
} as const;

export const SANS = "var(--family-sans), 'Noto Sans', system-ui, sans-serif";
export const MONO =
  "var(--family-mono), 'JetBrains Mono', ui-monospace, monospace";

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export function Card({
  children,
  ...rest
}: { children: ReactNode } & Record<string, unknown>) {
  return (
    <Box bg={P.surface} border="1px solid" borderColor={P.line} borderRadius="16px" {...rest}>
      {children}
    </Box>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  caps,
  ...rest
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  /** The design's spaced capitals, for the confirming buttons. */
  caps?: boolean;
} & Record<string, unknown>) {
  return (
    <chakra.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      h="54px"
      border="0"
      borderRadius="14px"
      bg={disabled ? P.greenDisabled : P.green}
      color={P.onFill}
      fontFamily="inherit"
      fontSize="15px"
      fontWeight={caps ? 700 : 600}
      letterSpacing={caps ? ".06em" : undefined}
      cursor={disabled ? "default" : "pointer"}
      flexShrink={0}
      _hover={disabled ? undefined : { bg: P.greenHover }}
      _focusVisible={{ outline: `2px solid ${P.ink}`, outlineOffset: "2px" }}
      {...rest}>
      {children}
    </chakra.button>
  );
}

export function Heading({ title, body }: { title: string; body?: string }) {
  return (
    <Flex direction="column" gap="8px">
      <chakra.h1 m="0" fontSize="22px" fontWeight={700} color={P.ink} css={{ textWrap: "pretty" }}>
        {title}
      </chakra.h1>
      {body && (
        <Text m="0" fontSize="15px" lineHeight="1.55" color={P.body} css={{ textWrap: "pretty" }}>
          {body}
        </Text>
      )}
    </Flex>
  );
}

export function Tick({ size = 18 }: { size?: number }) {
  return (
    <Flex
      w={`${size}px`}
      h={`${size}px`}
      borderRadius="50%"
      bg={P.greenDot}
      color={P.onFill}
      fontSize={`${Math.round(size * 0.6)}px`}
      fontWeight={700}
      align="center"
      justify="center"
      flexShrink={0}>
      ✓
    </Flex>
  );
}

export function OkStrip({ children }: { children: ReactNode }) {
  return (
    <Flex
      align="center"
      gap="8px"
      bg={P.okBg}
      border="1px solid"
      borderColor={P.okLine}
      borderRadius="10px"
      px="12px"
      py="10px">
      <Tick />
      <Text fontSize="13px" fontWeight={500} color={P.okInk}>
        {children}
      </Text>
    </Flex>
  );
}

/** Label/value rows with hairlines between them, as the design's lists are. */
export function Rows({
  rows,
  py = "12px",
  inkOf,
}: {
  rows: [string, string][];
  py?: string;
  inkOf?: (index: number) => string;
}) {
  return (
    <>
      {rows.map(([k, v], index) => (
        <Flex
          key={k}
          justify="space-between"
          gap="16px"
          py={py}
          borderBottom={index < rows.length - 1 ? `1px solid ${P.lineSoft}` : "0"}>
          <Text fontSize="13px" color={P.muted} flexShrink={0}>
            {k}
          </Text>
          <Text fontSize="13px" fontWeight={600} color={inkOf?.(index) ?? P.text} textAlign="right">
            {v}
          </Text>
        </Flex>
      ))}
    </>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <Text fontSize="11px" letterSpacing=".12em" fontWeight={600} color={P.sage}>
      {children}
    </Text>
  );
}

/**
 * Offers the link as an app on the family's phone. Renders nothing unless the
 * browser has an install to offer (or it is iOS Safari, which needs the
 * Share-sheet steps instead), so it costs nothing once installed.
 */
export function InstallLinkBanner({ token }: { token: string }) {
  // Each link is its own app, so each remembers its own dismissal.
  const { canShow, needsIosInstructions, install, dismiss } = useInstallPrompt(
    `osp-install-dismissed:${token}`,
  );
  if (!canShow) return null;

  return (
    <Flex
      role="region"
      aria-label="Install this service link"
      gap="12px"
      align="flex-start"
      bg={P.surface}
      border="1px solid"
      borderColor={P.okLine}
      borderRadius="12px"
      px="14px"
      py="12px">
      <Image
        src="/icons/family/icon-192.png"
        alt=""
        width={40}
        height={40}
        // The banner appears after load; a lazy image there may never start.
        loading="eager"
        style={{ borderRadius: 8, flexShrink: 0 }}
      />
      <Flex direction="column" gap="4px" flex="1" minW="0">
        <Text fontSize="14px" fontWeight={600} color={P.ink}>
          Add this service to your phone
        </Text>
        <Text fontSize="13px" lineHeight="1.5" color={P.body}>
          {needsIosInstructions ? (
            <>
              Tap the Share button{" "}
              <Box as="span" display="inline-flex" verticalAlign="text-bottom">
                <Share size={14} aria-label="Share" />
              </Box>{" "}
              in Safari, then choose &ldquo;Add to Home Screen&rdquo;.
            </>
          ) : (
            "Open it straight from your home screen to follow each step of the service."
          )}
        </Text>
        {!needsIosInstructions && (
          <chakra.button
            type="button"
            onClick={install}
            alignSelf="flex-start"
            mt="6px"
            h="36px"
            px="14px"
            border="0"
            borderRadius="10px"
            bg={P.green}
            color={P.onFill}
            fontFamily="inherit"
            fontSize="13px"
            fontWeight={600}
            cursor="pointer"
            _hover={{ bg: P.greenHover }}>
            Install
          </chakra.button>
        )}
      </Flex>
      <chakra.button
        type="button"
        aria-label="Dismiss"
        onClick={dismiss}
        w="32px"
        h="32px"
        border="0"
        borderRadius="8px"
        bg="transparent"
        color={P.muted}
        display="flex"
        alignItems="center"
        justifyContent="center"
        cursor="pointer"
        flexShrink={0}
        _hover={{ bg: P.chip }}>
        <X size={16} />
      </chakra.button>
    </Flex>
  );
}

/** The St. Peter mark. next/image serves it at header size, not the source's. */
export function Logo() {
  return (
    <Image
      src="/images/family-logo.png"
      alt="St. Peter"
      width={40}
      height={39}
      priority
      style={{ flexShrink: 0, width: 40, height: "auto" }}
    />
  );
}

/**
 * The camera preview inside the design's frame. The <video> is always mounted
 * so the scanner can attach to it; the stripes show until the picture is up.
 */
export function Viewfinder({
  videoRef,
  live,
  camera,
  aspect,
  frame,
  idleLabel,
  onRetry,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  /** The camera has been asked for on this view. */
  live: boolean;
  camera: CameraState;
  aspect: string;
  /** Corner brackets for a QR, a wide box for a casket barcode. */
  frame: "qr" | "barcode";
  idleLabel: string;
  onRetry: () => void;
}) {
  const showing = live && camera === "on";
  const failed = live && camera !== "on" && camera !== "starting" && camera !== "idle";
  const corner = (v: "top" | "bottom", h: "left" | "right") => ({
    position: "absolute" as const,
    [v]: 0,
    [h]: 0,
    w: "36px",
    h: "36px",
    [`border${v === "top" ? "Top" : "Bottom"}`]: `4px solid ${P.greenBright}`,
    [`border${h === "left" ? "Left" : "Right"}`]: `4px solid ${P.greenBright}`,
    [`border${v === "top" ? "Top" : "Bottom"}${h === "left" ? "Left" : "Right"}Radius`]: "10px",
  });

  return (
    <Box
      position="relative"
      w="full"
      maxW="420px"
      alignSelf="center"
      css={{ aspectRatio: aspect }}
      borderRadius={frame === "qr" ? "20px" : "16px"}
      overflow="hidden"
      bg="repeating-linear-gradient(135deg,#1b2a22 0 10px,#203229 10px 20px)"
      display="flex"
      alignItems="center"
      justifyContent="center">
      <chakra.video
        ref={videoRef}
        muted
        playsInline
        aria-label="Camera preview"
        position="absolute"
        inset="0"
        w="full"
        h="full"
        objectFit="cover"
        opacity={showing ? 1 : 0}
        transition="opacity .2s"
      />
      {frame === "qr" ? (
        <Box position="absolute" inset="18%">
          <Box {...corner("top", "left")} />
          <Box {...corner("top", "right")} />
          <Box {...corner("bottom", "left")} />
          <Box {...corner("bottom", "right")} />
        </Box>
      ) : (
        <Box
          position="absolute"
          left="12%"
          right="12%"
          top="40%"
          bottom="40%"
          border={`3px solid ${P.greenBright}`}
          borderRadius="8px"
        />
      )}
      {!showing && (
        <Flex position="relative" direction="column" align="center" gap="10px" px="24px" textAlign="center">
          <Text fontFamily={MONO} fontSize="11px" color="#9fb5a9" lineHeight="1.5">
            {failed ? cameraMessage(camera) : live ? "starting camera…" : idleLabel}
          </Text>
          {failed && canRetryCamera(camera) && (
            <chakra.button
              type="button"
              onClick={onRetry}
              display="flex"
              alignItems="center"
              gap="6px"
              h="34px"
              px="12px"
              borderRadius="10px"
              border="1px solid rgba(159,181,169,.5)"
              bg="transparent"
              color="#d9e6df"
              fontFamily="inherit"
              fontSize="12px"
              fontWeight={600}
              cursor="pointer">
              <RotateCcw size={13} />
              Try camera again
            </chakra.button>
          )}
        </Flex>
      )}
    </Box>
  );
}

/** For when the camera can't read the code: typing it in does the same. */
export function ManualEntry({
  id,
  value,
  onChange,
  onSubmit,
  placeholder,
  samples,
  onSample,
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  placeholder: string;
  samples: string[];
  onSample: (code: string) => void;
}) {
  return (
    <Flex direction="column" gap="8px">
      <chakra.label htmlFor={id} fontSize="13px" fontWeight={600} color={P.ink}>
        Can&apos;t scan? Enter the code
      </chakra.label>
      <Flex gap="8px">
        <chakra.input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onSubmit();
          }}
          placeholder={placeholder}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          flex="1"
          minW="0"
          h="48px"
          px="14px"
          borderRadius="12px"
          border="1.5px solid"
          borderColor={P.field}
          bg={P.surface}
          color={P.text}
          fontFamily={MONO}
          fontSize="14px"
          textTransform="uppercase"
          outline="none"
          _focusVisible={{ borderColor: P.green }}
        />
        <chakra.button
          type="button"
          onClick={onSubmit}
          h="48px"
          px="16px"
          borderRadius="12px"
          border={`1.5px solid ${P.green}`}
          bg={P.surface}
          color={P.green}
          fontFamily="inherit"
          fontSize="14px"
          fontWeight={600}
          cursor="pointer"
          _hover={{ bg: P.okBg }}>
          Enter
        </chakra.button>
      </Flex>
      {samples.length > 0 && (
        <Flex gap="6px" wrap="wrap" align="center">
          <Text fontSize="11px" color={P.faint}>
            Demo codes:
          </Text>
          {samples.map((code) => (
            <chakra.button
              key={code}
              type="button"
              onClick={() => onSample(code)}
              fontFamily={MONO}
              fontSize="11px"
              color={P.sage}
              bg={P.chip}
              border={`1px solid ${P.chipLine}`}
              borderRadius="6px"
              px="8px"
              py="3px"
              cursor="pointer">
              {code}
            </chakra.button>
          ))}
        </Flex>
      )}
    </Flex>
  );
}
