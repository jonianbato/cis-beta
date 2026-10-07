"use client";

import { Box, Flex, Grid, Text, chakra } from "@chakra-ui/react";
import { LoaderCircle, TriangleAlert } from "lucide-react";
import { EMBALMERS, type EmbalmRequest } from "./data";
import { C, field, fieldLabel } from "./theme";
import { Panel, Segmented } from "./chrome";

export type EmbalmOutcome = "normal" | "with_complications";

/**
 * The post-embalming encoding, field for field with the MIS "Actual Values"
 * section: each requested preparation gets its actual counterpart, and any
 * deviation has to be explained before the summary can be saved.
 */
export type EmbalmForm = EmbalmRequest & {
  embalmer: string;
  start: string;
  end: string;
  outcome: EmbalmOutcome;
  remarks: string;
  /** Per field, required wherever the actual value differs from the request. */
  deviationNotes: Partial<Record<keyof EmbalmRequest, string>>;
};

/** Actuals start at what was requested, so only a deviation needs a tap. */
export function emptyEmbalmForm(
  embalmer: string,
  requested: EmbalmRequest,
): EmbalmForm {
  return {
    ...requested,
    embalmer,
    start: "",
    end: "",
    outcome: "normal",
    remarks: "",
    deviationNotes: {},
  };
}

type Choice<T> = { value: T; label: string };

const YES_NO: [Choice<boolean>, Choice<boolean>] = [
  { value: true, label: "Yes" },
  { value: false, label: "No" },
];

/** One row per requested preparation, in the MIS order. */
const COMPARED: {
  [K in keyof EmbalmRequest]: {
    key: K;
    label: string;
    options: [Choice<EmbalmRequest[K]>, Choice<EmbalmRequest[K]>];
  };
}[keyof EmbalmRequest][] = [
  {
    key: "handPosition",
    label: "Hand position",
    options: [
      { value: "side", label: "Side" },
      { value: "stomach", label: "Stomach" },
    ],
  },
  { key: "shaveFacialHair", label: "Shave", options: YES_NO },
  { key: "trimNails", label: "Trim nails", options: YES_NO },
  { key: "hairDye", label: "Hair dye", options: YES_NO },
  {
    key: "clothesDisposition",
    label: "Clothes",
    options: [
      { value: "surrender_to_family", label: "Surrender" },
      { value: "proper_disposal", label: "Disposal" },
    ],
  },
];

/** Every field that differs from the request has its own remark. */
export function deviationsExplained(
  form: EmbalmForm,
  requested: EmbalmRequest,
) {
  return COMPARED.every(
    ({ key }) =>
      form[key] === requested[key] || !!form.deviationNotes[key]?.trim(),
  );
}

/** Blank until both times are set and the end is genuinely after the start. */
function durationLabel(start: string, end: string): string {
  if (!start || !end || end <= start) return "—";
  const [from, to] = [start, end].map((value) => {
    const [hours, minutes] = value.split(":").map(Number);
    return hours * 60 + minutes;
  });
  const total = to - from;
  return `${Math.floor(total / 60)}h ${total % 60}m`;
}

/**
 * iOS Safari draws time inputs with a native control that ignores the width
 * it is given; dropping the native appearance makes it fit its column. Without
 * it the value sits top-left with a margin under it, so the line height
 * (44px less the 1.5px borders) centres it again.
 */
const timeField = {
  display: "block",
  minW: "0",
  appearance: "none",
  py: "0",
  lineHeight: "41px",
  css: {
    "&::-webkit-date-and-time-value": {
      textAlign: "left",
      margin: "0",
      lineHeight: "41px",
    },
    "&::-webkit-datetime-edit": { padding: "0", lineHeight: "41px" },
  },
} as const;

function FieldLabel({ children }: { children: string }) {
  return <Text {...fieldLabel}>{children}</Text>;
}

/**
 * What the family asked for, shown when the toe tag is scanned for embalming.
 * Read-only: the actuals are recorded on the summary once embalming is done.
 */
export function EmbalmRequestScreen({
  name,
  meta,
  rows,
  requested,
  status,
  active,
}: {
  name: string;
  meta: string;
  rows: [string, string][];
  requested: EmbalmRequest;
  status: string;
  /** The procedure is under way: the status reads as live, not as a warning. */
  active: boolean;
}) {
  return (
    <>
      <Panel px="14px" py="12px">
        <Text fontSize="15px" fontWeight={800} color={C.ink}>
          {name}
        </Text>
        <Text fontSize="11.5px" color={C.sage} mt="2px">
          {meta}
        </Text>
      </Panel>

      <Flex
        align="center"
        gap="6px"
        px="12px"
        py="9px"
        borderRadius="10px"
        bg={active ? C.tintBg : C.amberBg}
        border="1px solid"
        borderColor={active ? C.tintBorder : C.amberLine}
        role="status">
        {active ? (
          <Box animation="spin 1.4s linear infinite" display="flex">
            <LoaderCircle size={14} color={C.green} />
          </Box>
        ) : (
          <TriangleAlert size={14} color={C.amberIcon} />
        )}
        <Text
          fontSize="12px"
          fontWeight={800}
          color={active ? C.greenDeeper : C.amberInk}>
          {status}
        </Text>
      </Flex>

      <Panel overflow="hidden">
        {rows.map(([label, value], index) => (
          <Flex
            key={label}
            justify="space-between"
            gap="10px"
            px="14px"
            py="10px"
            borderBottom={index === rows.length - 1 ? undefined : "1px solid"}
            borderColor={C.lineFaint}>
            <Text fontSize="12px" fontWeight={700} color={C.faint}>
              {label}
            </Text>
            <Text fontSize="13px" fontWeight={800} color={C.ink} textAlign="right">
              {value}
            </Text>
          </Flex>
        ))}
      </Panel>

      <Panel overflow="hidden">
        <Box
          px="14px"
          py="10px"
          bg={C.tintBg}
          borderBottom="1px solid"
          borderColor={C.lineSoft}>
          <Text fontSize="12px" fontWeight={800} color={C.ink}>
            Embalming request
          </Text>
          <Text fontSize="11px" color={C.faint} mt="2px">
            As requested by the family
          </Text>
        </Box>
        {COMPARED.map(({ key, label, options }, index) => (
          <Flex
            key={key}
            justify="space-between"
            gap="10px"
            px="14px"
            py="10px"
            borderBottom={index === COMPARED.length - 1 ? undefined : "1px solid"}
            borderColor={C.lineFaint}>
            <Text fontSize="13px" fontWeight={700} color={C.ink}>
              {label}
            </Text>
            <Text fontSize="13px" fontWeight={800} color={C.greenDeep}>
              {(options as Choice<unknown>[]).find(
                (choice) => choice.value === requested[key],
              )?.label ?? "—"}
            </Text>
          </Flex>
        ))}
      </Panel>
    </>
  );
}

/** The record the embalmer files before the family is asked to authorize. */
export function EmbalmScreen({
  name,
  meta,
  requested,
  value,
  onChange,
}: {
  name: string;
  meta: string;
  requested: EmbalmRequest;
  value: EmbalmForm;
  onChange: (next: EmbalmForm) => void;
}) {
  const patch = (changes: Partial<EmbalmForm>) =>
    onChange({ ...value, ...changes });

  return (
    <>
      <Panel px="14px" py="12px">
        <Text fontSize="15px" fontWeight={800} color={C.ink}>
          {name}
        </Text>
        <Text fontSize="11.5px" color={C.sage} mt="2px">
          {meta}
        </Text>
      </Panel>

      <Box>
        <FieldLabel>Actual embalmer</FieldLabel>
        <chakra.select
          {...field}
          value={value.embalmer}
          onChange={(event) => patch({ embalmer: event.target.value })}>
          {EMBALMERS.map((person) => (
            <option key={person} value={person}>
              {person}
            </option>
          ))}
        </chakra.select>
      </Box>

      {/* minmax(0, …) and minW 0 let the time fields shrink: iOS Safari gives
          them a wide intrinsic size that otherwise spills over the next one. */}
      <Grid
        templateColumns="minmax(0, 1fr) minmax(0, 1fr) auto"
        gap="10px"
        alignItems="end">
        <Box minW="0">
          <FieldLabel>Start</FieldLabel>
          <chakra.input
            {...field}
            {...timeField}
            type="time"
            value={value.start}
            onChange={(event) => patch({ start: event.target.value })}
          />
        </Box>
        <Box minW="0">
          <FieldLabel>End</FieldLabel>
          <chakra.input
            {...field}
            {...timeField}
            type="time"
            value={value.end}
            onChange={(event) => patch({ end: event.target.value })}
          />
        </Box>
        <Flex h="44px" minW="56px" direction="column" justify="center">
          <Text fontSize="10px" fontWeight={700} color={C.fainter}>
            Duration
          </Text>
          <Text fontSize="13px" fontWeight={800} color={C.ink} whiteSpace="nowrap">
            {durationLabel(value.start, value.end)}
          </Text>
        </Flex>
      </Grid>

      <Panel overflow="hidden">
        <Box
          px="14px"
          py="10px"
          bg={C.tintBg}
          borderBottom="1px solid"
          borderColor={C.lineSoft}>
          <Text fontSize="12px" fontWeight={800} color={C.ink}>
            Requested vs actual
          </Text>
          <Text fontSize="11px" color={C.faint} mt="2px">
            Record what was actually performed
          </Text>
        </Box>
        {COMPARED.map(({ key, label, options }, index) => {
          const choices = options as Choice<EmbalmRequest[typeof key]>[];
          const labelOf = (v: unknown) =>
            choices.find((choice) => choice.value === v)?.label ?? "—";
          const off = value[key] !== requested[key];
          return (
            <Box
              key={key}
              px="14px"
              py="10px"
              bg={off ? C.amberBg : undefined}
              borderBottom={index === COMPARED.length - 1 ? undefined : "1px solid"}
              borderColor={C.lineFaint}>
              <Flex justify="space-between" align="baseline" gap="8px" mb="6px">
                <Flex align="center" gap="6px">
                  <Text fontSize="13px" fontWeight={700} color={C.ink}>
                    {label}
                  </Text>
                  {off && <TriangleAlert size={14} color={C.amberIcon} />}
                </Flex>
                <Text fontSize="11px" color={C.faint}>
                  Requested: {labelOf(requested[key])}
                </Text>
              </Flex>
              <Segmented
                options={choices.map((choice) => choice.label)}
                value={labelOf(value[key])}
                onChange={(next) => {
                  const actual = choices.find((choice) => choice.label === next)?.value;
                  // Back in line with the request, the field's remark no
                  // longer explains anything, so it is not kept on the record.
                  const { [key]: _dropped, ...otherNotes } = value.deviationNotes;
                  void _dropped;
                  patch({
                    [key]: actual,
                    deviationNotes:
                      actual === requested[key] ? otherNotes : value.deviationNotes,
                  });
                }}
              />
              {off && (
                <Box mt="8px">
                  <chakra.label
                    htmlFor={`deviation-${key}`}
                    display="flex"
                    alignItems="center"
                    gap="5px"
                    mb="6px"
                    fontSize="11.5px"
                    fontWeight={800}
                    color={C.amberInk}>
                    <TriangleAlert size={13} color={C.amberIcon} />
                    Remarks required · {label} differs from request
                  </chakra.label>
                  <chakra.input
                    id={`deviation-${key}`}
                    {...field}
                    borderColor={C.amberIcon}
                    value={value.deviationNotes[key] ?? ""}
                    placeholder={`Why ${label.toLowerCase()} differs from the request`}
                    onChange={(event) =>
                      patch({
                        deviationNotes: {
                          ...value.deviationNotes,
                          [key]: event.target.value,
                        },
                      })
                    }
                  />
                </Box>
              )}
            </Box>
          );
        })}
      </Panel>

      <Box>
        <FieldLabel>Embalming outcome</FieldLabel>
        <Segmented
          options={["Normal", "With complications"]}
          value={value.outcome === "normal" ? "Normal" : "With complications"}
          onChange={(next) =>
            patch({
              outcome: next === "Normal" ? "normal" : "with_complications",
            })
          }
        />
      </Box>

      <Box>
        <FieldLabel>Remarks (optional)</FieldLabel>
        <chakra.textarea
          {...field}
          h="auto"
          minH="76px"
          py="10px"
          fontWeight={400}
          resize="vertical"
          value={value.remarks}
          placeholder="Restorative work, notes for viewing"
          onChange={(event) => patch({ remarks: event.target.value })}
        />
      </Box>
    </>
  );
}
