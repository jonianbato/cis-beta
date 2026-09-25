"use client";

import { Box, Flex, Text, chakra } from "@chakra-ui/react";
import { ShieldCheck } from "lucide-react";
import { C, MONO } from "./theme";
import { ConfirmedStrip, InlineRow, Panel, TickBadge } from "./chrome";

export type StepView = {
  key: string;
  label: string;
  hint: string;
  /** Timestamp the step closed at, or empty while it is still open. */
  at: string;
  otp?: boolean;
};

/**
 * The spine of a service run: which step is next, and what has already been
 * authorized. The operator never chooses a step — the list is read-only and the
 * footer starts whichever one comes next.
 */
export function ProcessScreen({
  pipelineLabel,
  deceased,
  meta,
  steps,
  nextKey,
}: {
  pipelineLabel: string;
  deceased: string;
  meta: string;
  steps: StepView[];
  nextKey: string | null;
}) {
  const doneCount = steps.filter((step) => step.at).length;

  return (
    <>
      <Box borderRadius="14px" bg={C.green} color={C.surface} px="14px" py="12px">
        <Text fontSize="10.5px" fontWeight={800} opacity={0.85} letterSpacing="0.04em">
          {pipelineLabel}
        </Text>
        <Text fontSize="16px" fontWeight={800} mt="2px">
          {deceased}
        </Text>
        <Text fontSize="11.5px" fontWeight={700} opacity={0.9} mt="2px" fontFamily={MONO}>
          {meta}
        </Text>
      </Box>

      {nextKey ? (
        <Box
          border="1.5px solid"
          borderColor={C.green}
          borderRadius="14px"
          px="14px"
          py="12px"
          bg={C.tintBg}>
          <Text fontSize="10.5px" fontWeight={800} color={C.greenDeep} letterSpacing="0.04em">
            NEXT TO AUTHORIZE
          </Text>
          <Text fontSize="16px" fontWeight={800} color={C.ink} mt="3px">
            {steps.find((step) => step.key === nextKey)?.label}
          </Text>
          <Text fontSize="12px" color={C.muted} mt="2px">
            {steps.find((step) => step.key === nextKey)?.hint}
          </Text>
        </Box>
      ) : (
        steps.length > 0 && (
          <Box
            borderRadius="14px"
            px="14px"
            py="12px"
            bg={C.tint}
            border="1px solid"
            borderColor={C.tintLine}
            fontSize="13px"
            fontWeight={800}
            color={C.greenDeeper}>
            All steps complete
          </Box>
        )
      )}

      <Flex align="center" justify="space-between">
        <Text fontSize="12px" fontWeight={800} color={C.faint}>
          Process
        </Text>
        <Text fontSize="11.5px" fontWeight={700} color={C.faint}>
          {doneCount} of {steps.length} steps done
        </Text>
      </Flex>

      <Box display="flex" flexDirection="column">
        {steps.map((step, index) => {
          const done = !!step.at;
          const isNext = step.key === nextKey;
          const last = index === steps.length - 1;
          return (
            <Flex key={step.key} gap="12px">
              <Flex direction="column" align="center">
                <Flex
                  w="26px"
                  h="26px"
                  borderRadius="50%"
                  flexShrink={0}
                  align="center"
                  justify="center"
                  fontSize="11.5px"
                  fontWeight={800}
                  bg={done ? C.green : isNext ? C.surface : C.lineFaint}
                  color={done ? C.surface : isNext ? C.green : C.fainter}
                  border="2px solid"
                  borderColor={done || isNext ? C.green : C.line}>
                  {done ? "✓" : index + 1}
                </Flex>
                {!last && (
                  <Box
                    w="2px"
                    flex="1"
                    minH="14px"
                    my="2px"
                    bg={done ? C.green : C.line}
                  />
                )}
              </Flex>
              <Box flex="1" minW="0" pt="3px" pb="14px">
                <Text
                  fontSize="13.5px"
                  fontWeight={isNext ? 800 : 700}
                  color={done || isNext ? C.ink : C.fainter}>
                  {step.label}
                </Text>
                <Text
                  fontSize="11.5px"
                  mt="2px"
                  color={isNext ? C.greenDeep : C.faint}
                  fontWeight={isNext ? 700 : 400}>
                  {done
                    ? `${step.otp === false ? "Matched" : "Family authorized"} · ${step.at}`
                    : isNext
                      ? step.hint
                      : "Waiting"}
                </Text>
              </Box>
            </Flex>
          );
        })}
      </Box>
    </>
  );
}

/**
 * One leg of a trip: departure from where it starts, or arrival where it
 * ends — the retrieval site to the chapel, or the chapel to a viewing venue.
 */
export function MoveScreen({
  arriving,
  fromLabel,
  toLabel,
  from,
  to,
  rows,
}: {
  arriving: boolean;
  /** The start and end as a phrase, e.g. "the chapel". */
  fromLabel: string;
  toLabel: string;
  from: string;
  to: string;
  rows: [string, string][];
}) {
  return (
    <>
      <Text fontSize="15px" fontWeight={800} color={C.ink}>
        {arriving
          ? `Confirm arrival at ${toLabel}`
          : `Confirm departure from ${fromLabel}`}
      </Text>

      <Panel p="14px" display="flex" gap="12px">
        <Flex direction="column" align="center" pt="4px">
          <Box w="10px" h="10px" borderRadius="50%" border="2px solid" borderColor={C.green} />
          <Box w="2px" flex="1" bg={C.mint} my="3px" />
          <Box w="10px" h="10px" borderRadius="50%" bg={C.green} />
        </Flex>
        <Box flex="1" minW="0" display="flex" flexDirection="column" gap="16px">
          <Box>
            <Text fontSize="10.5px" fontWeight={700} color={C.fainter}>
              From
            </Text>
            <Text fontSize="13.5px" fontWeight={700} color={C.ink}>
              {from}
            </Text>
          </Box>
          <Box>
            <Text fontSize="10.5px" fontWeight={700} color={C.fainter}>
              To
            </Text>
            <Text fontSize="13.5px" fontWeight={700} color={C.ink}>
              {to}
            </Text>
          </Box>
        </Box>
      </Panel>

      <Panel overflow="hidden">
        {rows.map(([label, value], index) => (
          <InlineRow
            key={label}
            label={label}
            value={value}
            last={index === rows.length - 1}
          />
        ))}
      </Panel>
    </>
  );
}

/** What the family is shown before they authorize the step. */
export function ReviewScreen({
  photoUrl,
  rows,
  tagLabel,
  tagLinked,
}: {
  photoUrl: string;
  rows: [string, string][];
  tagLabel: string;
  tagLinked: boolean;
}) {
  return (
    <>
      <Text fontSize="12.5px" color={C.muted} lineHeight="1.5">
        Family reviews the deceased details, toe tag and photo with you before
        authorizing.
      </Text>

      <Panel p="14px" display="flex" gap="14px">
        <Box
          w="84px"
          h="104px"
          borderRadius="10px"
          overflow="hidden"
          bg={C.canvas}
          flexShrink={0}
          backgroundImage={photoUrl ? `url("${photoUrl}")` : undefined}
          backgroundSize="cover"
          backgroundPosition="center"
        />
        <Box flex="1" minW="0" display="flex" flexDirection="column" gap="7px">
          {rows.map(([label, value]) => (
            <Box key={label}>
              <Text fontSize="10px" fontWeight={700} color={C.fainter}>
                {label}
              </Text>
              <Text fontSize="12.5px" fontWeight={700} color={C.ink}>
                {value}
              </Text>
            </Box>
          ))}
        </Box>
      </Panel>

      {tagLinked ? (
        <ConfirmedStrip label={tagLabel} />
      ) : (
        <Text fontSize="12px" fontWeight={700} color={C.muted}>
          {tagLabel}
        </Text>
      )}
    </>
  );
}

/** The hand-off to the family: who gets the code, and why. */
export function AuthorizeScreen({
  stepLabel,
  contactName,
  contactMasked,
}: {
  stepLabel: string;
  contactName: string;
  contactMasked: string;
}) {
  return (
    <>
      <Flex direction="column" align="center" gap="10px" pt="16px" pb="4px" textAlign="center">
        <Flex w="64px" h="64px" borderRadius="50%" bg={C.tint} align="center" justify="center">
          <ShieldCheck size={30} color={C.green} strokeWidth={1.8} />
        </Flex>
        <Text fontSize="17px" fontWeight={800} color={C.ink}>
          Authorize: {stepLabel}
        </Text>
        <Text fontSize="13px" color={C.muted} lineHeight="1.5" maxW="290px">
          Tasks for this step are done. Send a one-time code to the registered
          family contact — they read it back to you to approve.
        </Text>
      </Flex>

      <Panel px="14px" py="12px" display="flex" flexDirection="column" gap="4px">
        <Text fontSize="10.5px" fontWeight={700} color={C.fainter}>
          Registered contact
        </Text>
        <Text fontSize="14px" fontWeight={800} color={C.ink}>
          {contactName}
        </Text>
        <Text fontSize="12.5px" color={C.muted} fontFamily={MONO}>
          {contactMasked}
        </Text>
      </Panel>
    </>
  );
}

/**
 * Six boxes with one transparent input stretched across them: the phone keyboard
 * and SMS autofill both want a single field, while the design wants six cells.
 */
export function OtpScreen({
  sentTo,
  otp,
  onOtpChange,
  timerLabel,
  expired,
  onResend,
}: {
  sentTo: string;
  otp: string;
  onOtpChange: (next: string) => void;
  timerLabel: string;
  expired: boolean;
  onResend: () => void;
}) {
  const digits = otp.split("");

  return (
    <>
      <Flex direction="column" align="center" gap="6px" pt="8px" textAlign="center">
        <TickBadge size={40} />
        <Text fontSize="16px" fontWeight={800} color={C.ink}>
          OTP sent
        </Text>
        <Text fontSize="12.5px" color={C.muted}>
          {sentTo}
        </Text>
      </Flex>

      <Text fontSize="11.5px" fontWeight={800} color={C.faint} textAlign="center" mt="4px">
        Enter the code provided by the family
      </Text>

      <Box position="relative" display="flex" justifyContent="center" gap="8px">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <Flex
            key={index}
            w="44px"
            h="52px"
            borderRadius="10px"
            border="1.5px solid"
            borderColor={index === digits.length ? C.green : C.field}
            align="center"
            justify="center"
            fontSize="20px"
            fontWeight={800}
            color={C.ink}
            fontFamily={MONO}>
            {digits[index] ?? ""}
          </Flex>
        ))}
        <chakra.input
          value={otp}
          onChange={(event) => onOtpChange(event.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          aria-label="One-time code"
          position="absolute"
          inset="0"
          opacity={0}
          fontSize="16px"
          cursor="text"
        />
      </Box>

      <Text
        fontSize="12px"
        fontWeight={700}
        textAlign="center"
        color={expired ? C.redText : C.sage}>
        {timerLabel}
      </Text>

      <chakra.button
        type="button"
        onClick={onResend}
        fontSize="13px"
        fontWeight={800}
        color={C.greenDeep}
        textAlign="center"
        cursor="pointer"
        p="6px">
        Resend OTP
      </chakra.button>

      <Text fontSize="10.5px" color={C.fainter} textAlign="center">
        Demo code: 123456
      </Text>
    </>
  );
}
