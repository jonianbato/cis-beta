"use client";

import { Box, Flex, Text, chakra } from "@chakra-ui/react";
import { BellRing, LoaderCircle, ShieldCheck } from "lucide-react";
import { C, MONO, field, fieldLabel } from "./theme";
import { InlineRow, Panel, Segmented, TickBadge } from "./chrome";

export type StepView = {
  key: string;
  label: string;
  hint: string;
  /** Timestamp the step closed at, or empty while it is still open. */
  at: string;
  otp?: boolean;
  doneLabel?: string;
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
      <Box borderRadius="14px" bg={C.green} color={C.onFill} px="14px" py="12px">
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
                  color={done ? C.onFill : isNext ? C.green : C.fainter}
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
                    ? `${step.doneLabel ?? (step.otp === false ? "Matched" : "Family authorized")} · ${step.at}`
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

/**
 * Back at the chapel, the crew hands the deceased over for embalming. The
 * receiver is named here; confirming the receipt is the next step, theirs.
 */
export function EndorseScreen({
  roles,
  role,
  onRoleChange,
  people,
  name,
  onNameChange,
  rows,
}: {
  roles: string[];
  role: string;
  onRoleChange: (next: string) => void;
  /** The staff on duty in the chosen role. */
  people: string[];
  name: string;
  onNameChange: (next: string) => void;
  rows: [string, string][];
}) {
  return (
    <>
      <Text fontSize="12.5px" color={C.muted} lineHeight="1.5">
        Return to chapel · embalming. Endorse the deceased to the CM/FCR or the
        guard on duty. They confirm receiving in the next step by scanning the
        toe tag QR and taking a photo.
      </Text>

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

      <Box>
        <Text {...fieldLabel}>Endorse to</Text>
        <Segmented options={roles} value={role} onChange={onRoleChange} />
      </Box>

      <Box>
        <chakra.label htmlFor="endorse-receiver" {...fieldLabel} display="block">
          Name of {role}
        </chakra.label>
        <chakra.select
          id="endorse-receiver"
          {...field}
          value={name}
          color={name ? C.ink : C.fainter}
          onChange={(event) => onNameChange(event.target.value)}>
          <option value="" disabled>
            Select {role}
          </option>
          {people.map((person) => (
            <option key={person} value={person}>
              {person}
            </option>
          ))}
        </chakra.select>
      </Box>
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
          family contact — they read it back to you to approve — or ask them to
          approve it in their St. Peter app.
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
 * The app route to the same approval: the family's phone gets a notification
 * and the operator waits here until the family confirms it.
 */
export function AppWaitScreen({
  stepLabel,
  contactName,
}: {
  stepLabel: string;
  contactName: string;
}) {
  return (
    <>
      <Flex direction="column" align="center" gap="10px" pt="16px" pb="4px" textAlign="center">
        <Flex w="64px" h="64px" borderRadius="50%" bg={C.tint} align="center" justify="center">
          <Box animation="spin 1.1s linear infinite" display="flex">
            <LoaderCircle size={30} color={C.green} strokeWidth={2} />
          </Box>
        </Flex>
        <Text fontSize="17px" fontWeight={800} color={C.ink}>
          Waiting for authorization
        </Text>
        <Text fontSize="13px" color={C.muted} lineHeight="1.5" maxW="290px">
          A notification was sent to {contactName}&apos;s St. Peter app. Ask them
          to open it and confirm <b>{stepLabel}</b>.
        </Text>
      </Flex>

      <Panel px="14px" py="12px" display="flex" alignItems="center" gap="12px">
        <Flex w="36px" h="36px" borderRadius="10px" bg={C.tint} align="center" justify="center" flexShrink={0}>
          <BellRing size={18} color={C.green} />
        </Flex>
        <Box minW="0">
          <Text fontSize="12.5px" fontWeight={800} color={C.ink}>
            Process waiting for confirmation
          </Text>
          <Text fontSize="11.5px" color={C.muted}>
            Sent to {contactName} · this screen moves on once they approve
          </Text>
        </Box>
      </Panel>

      <Text fontSize="10.5px" color={C.fainter} textAlign="center">
        Demo: the family approves after 3–5 seconds
      </Text>
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
