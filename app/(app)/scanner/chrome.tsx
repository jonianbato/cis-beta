"use client";

import type { ReactNode } from "react";
import { Box, Flex, Text, chakra } from "@chakra-ui/react";
import { Check, X } from "lucide-react";
import { C, MONO, panel } from "./theme";

/**
 * The app shell's bottom navigation is fixed to the viewport, so anything this
 * flow sticks to the bottom has to clear it. The bar is 62px plus the phone's
 * safe area, and it is only mounted below the `lg` breakpoint.
 */
export const NAV_CLEARANCE = {
  base: "calc(62px + env(safe-area-inset-bottom, 0px))",
  lg: "0px",
};

/**
 * How far through the step list the service has got, one segment per step,
 * filled when done. The title and back button live in the kit page header.
 */
export function FlowProgress({ steps }: { steps: boolean[] }) {
  return (
    <Flex gap="4px" role="presentation">
      {steps.map((done, index) => (
        <Box
          key={index}
          flex="1"
          h="4px"
          borderRadius="2px"
          bg={done ? C.green : C.line}
        />
      ))}
    </Flex>
  );
}

export type FooterAction = {
  label: string;
  onClick: () => void;
  /** A disabled-looking primary the design still keeps clickable-inert. */
  enabled?: boolean;
  tone?: "danger";
};

/** The one decision available on the current step, pinned above the fold. */
export function FlowFooter({
  primary,
  secondary,
}: {
  primary: FooterAction;
  secondary?: { label: string; onClick: () => void };
}) {
  const enabled = primary.enabled !== false;
  return (
    <Box
      position="sticky"
      bottom={NAV_CLEARANCE}
      // Bleed past the kit page's 16px mobile gutter so the bar spans the screen.
      mx={{ base: "-16px", lg: 0 }}
      bg={C.surface}
      borderTop="1px solid"
      borderColor={C.lineSoft}
      px="16px"
      pt="12px"
      pb="16px"
      display="flex"
      flexDirection="column"
      gap="8px">
      <chakra.button
        type="button"
        onClick={() => enabled && primary.onClick()}
        disabled={!enabled}
        h="48px"
        borderRadius="12px"
        display="flex"
        alignItems="center"
        justifyContent="center"
        fontSize="14.5px"
        fontWeight={800}
        cursor={enabled ? "pointer" : "default"}
        userSelect="none"
        bg={!enabled ? C.line : primary.tone === "danger" ? C.red : C.green}
        color={enabled ? C.onFill : C.fainter}
        _focusVisible={{ outline: `2px solid ${C.greenDeep}`, outlineOffset: "2px" }}>
        {primary.label}
      </chakra.button>

      {secondary && (
        <chakra.button
          type="button"
          onClick={secondary.onClick}
          h="48px"
          borderRadius="12px"
          display="flex"
          alignItems="center"
          justifyContent="center"
          fontSize="14.5px"
          fontWeight={800}
          cursor="pointer"
          bg={C.surface}
          color={C.greenDeep}
          border="1.5px solid"
          borderColor={C.mint}>
          {secondary.label}
        </chakra.button>
      )}
    </Box>
  );
}

/** Transient confirmation, floated clear of both the footer and the nav bar. */
export function Toast({ message }: { message: string }) {
  return (
    <Box
      position="fixed"
      left="50%"
      bottom={{
        base: "calc(96px + env(safe-area-inset-bottom, 0px) + 62px)",
        lg: "96px",
      }}
      transform="translateX(-50%)"
      bg={C.ink}
      color={C.surface}
      fontSize="12.5px"
      fontWeight={700}
      px="18px"
      py="11px"
      borderRadius="22px"
      zIndex={140}
      maxW="360px"
      textAlign="center"
      boxShadow="0 12px 30px rgba(15,44,28,0.28)"
      role="status">
      {message}
    </Box>
  );
}

/** The hairline-bordered block most grouped content in the flow sits in. */
export function Panel({
  children,
  ...rest
}: { children: ReactNode } & Record<string, unknown>) {
  return (
    <Box {...panel} {...rest}>
      {children}
    </Box>
  );
}

/** A label/value pair stacked in a bordered list. */
export function StackedRow({
  label,
  value,
  last,
}: {
  label: string;
  value: ReactNode;
  last?: boolean;
}) {
  return (
    <Box
      px="14px"
      py="10px"
      borderBottom={last ? undefined : "1px solid"}
      borderColor={C.lineFaint}>
      <Text fontSize="10.5px" fontWeight={700} color={C.fainter}>
        {label}
      </Text>
      <Text fontSize="14px" fontWeight={700} color={C.ink} mt="2px">
        {value}
      </Text>
    </Box>
  );
}

/** A label/value pair on one line, optionally flagged as the mismatch. */
export function InlineRow({
  label,
  value,
  bad,
  last,
}: {
  label: string;
  value: ReactNode;
  bad?: boolean;
  last?: boolean;
}) {
  return (
    <Flex
      align="baseline"
      gap="10px"
      px="14px"
      py="10px"
      bg={bad ? C.redBg : C.surface}
      borderBottom={last ? undefined : "1px solid"}
      borderColor={C.lineFaint}>
      <Text fontSize="12px" fontWeight={700} color={C.faint} minW="92px">
        {label}
      </Text>
      <Text
        fontSize="13px"
        fontWeight={800}
        color={bad ? C.redInk : C.ink}
        minW="0"
        overflowWrap="anywhere">
        {value}
      </Text>
    </Flex>
  );
}

/** Green tick over a mint strip — the flow's "this part is settled" marker. */
export function ConfirmedStrip({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <Flex
      align="center"
      gap="10px"
      bg={C.tintBg}
      border="1px solid"
      borderColor={C.tintBorder}
      borderRadius="12px"
      px="12px"
      py="10px">
      <TickBadge size={18} />
      <Box minW="0">
        <Text
          fontSize={value ? "10.5px" : "12px"}
          fontWeight={700}
          color={value ? C.sage : C.greenDeeper}>
          {label}
        </Text>
        {value && (
          <Text fontSize="14px" fontWeight={800} color={C.ink} fontFamily={MONO}>
            {value}
          </Text>
        )}
      </Box>
    </Flex>
  );
}

/** A filled circle with a tick, used inline wherever a check is confirmed. */
export function TickBadge({ size = 16 }: { size?: number }) {
  return (
    <Flex
      w={`${size}px`}
      h={`${size}px`}
      borderRadius="50%"
      bg={C.green}
      align="center"
      justify="center"
      flexShrink={0}>
      <Check size={size * 0.62} color={C.onFill} strokeWidth={3} />
    </Flex>
  );
}

/** The full-bleed pass/fail moment at the end of a flow. */
export function Outcome({
  ok,
  title,
  children,
}: {
  ok: boolean;
  title: string;
  children: ReactNode;
}) {
  return (
    <Flex
      flex="1"
      direction="column"
      align="center"
      justify="center"
      gap="10px"
      textAlign="center"
      py="30px">
      <Flex
        w="72px"
        h="72px"
        borderRadius="50%"
        align="center"
        justify="center"
        bg={ok ? C.green : C.red}
        boxShadow={`0 10px 26px ${
          ok ? "rgba(22,163,74,0.3)" : "rgba(220,38,38,0.28)"
        }`}>
        {ok ? (
          <Check size={40} color={C.onFill} strokeWidth={2.6} />
        ) : (
          <X size={36} color={C.onFill} strokeWidth={2.6} />
        )}
      </Flex>
      <Text fontSize="21px" fontWeight={800} color={ok ? C.greenDeep : C.redText}>
        {title}
      </Text>
      <Text fontSize="13px" color={C.muted} lineHeight="1.5" maxW="290px">
        {children}
      </Text>
    </Flex>
  );
}

/** A two-option pill switch, as used for the yes/no confirmations. */
export function Segmented({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <Flex gap="4px" p="4px" border="1.5px solid" borderColor={C.field} borderRadius="22px">
      {options.map((option) => {
        const on = value === option;
        return (
          <chakra.button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={on}
            flex="1"
            h="36px"
            borderRadius="18px"
            display="flex"
            alignItems="center"
            justifyContent="center"
            fontSize="12.5px"
            fontWeight={800}
            cursor="pointer"
            bg={on ? C.green : "transparent"}
            color={on ? C.onFill : C.muted}>
            {option}
          </chakra.button>
        );
      })}
    </Flex>
  );
}

/** The red note that stops the operator proceeding. */
export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <Text
      fontSize="12px"
      fontWeight={700}
      color={C.redInk}
      bg={C.redBg}
      border="1px solid"
      borderColor={C.redLine}
      borderRadius="10px"
      px="12px"
      py="10px"
      textAlign="center"
      role="alert">
      {children}
    </Text>
  );
}
