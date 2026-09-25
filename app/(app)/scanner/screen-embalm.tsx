"use client";

import { Box, Flex, Grid, Text, chakra } from "@chakra-ui/react";
import { TriangleAlert } from "lucide-react";
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
  chemicals: string;
  remarks: string;
  /** Required whenever an actual value differs from the request. */
  deviationNotes: string;
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
    chemicals: "",
    remarks: "",
    deviationNotes: "",
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

export function hasDeviation(form: EmbalmForm, requested: EmbalmRequest) {
  return COMPARED.some(({ key }) => form[key] !== requested[key]);
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

function FieldLabel({ children }: { children: string }) {
  return <Text {...fieldLabel}>{children}</Text>;
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
  const deviates = hasDeviation(value, requested);

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

      <Grid templateColumns="1fr 1fr 70px" gap="10px" alignItems="end">
        <Box>
          <FieldLabel>Start</FieldLabel>
          <chakra.input
            {...field}
            type="time"
            value={value.start}
            onChange={(event) => patch({ start: event.target.value })}
          />
        </Box>
        <Box>
          <FieldLabel>End</FieldLabel>
          <chakra.input
            {...field}
            type="time"
            value={value.end}
            onChange={(event) => patch({ end: event.target.value })}
          />
        </Box>
        <Flex h="44px" direction="column" justify="center">
          <Text fontSize="10px" fontWeight={700} color={C.fainter}>
            Duration
          </Text>
          <Text fontSize="13px" fontWeight={800} color={C.ink}>
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
                onChange={(next) =>
                  patch({
                    [key]: choices.find((choice) => choice.label === next)?.value,
                  })
                }
              />
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
        <FieldLabel>Chemicals used</FieldLabel>
        <chakra.input
          {...field}
          value={value.chemicals}
          placeholder="e.g. Formaldehyde 25 index, 8 L"
          onChange={(event) => patch({ chemicals: event.target.value })}
        />
      </Box>

      <Box>
        {deviates ? (
          <Flex align="center" gap="5px" mb="6px">
            <TriangleAlert size={13} color={C.amberIcon} />
            <Text fontSize="11.5px" fontWeight={800} color={C.amberInk}>
              Deviation detected — notes required
            </Text>
          </Flex>
        ) : (
          <FieldLabel>Remarks (optional)</FieldLabel>
        )}
        <chakra.textarea
          {...field}
          h="auto"
          minH="76px"
          py="10px"
          fontWeight={400}
          resize="vertical"
          borderColor={deviates ? C.amberIcon : C.field}
          bg={deviates ? C.amberBg : C.surface}
          value={deviates ? value.deviationNotes : value.remarks}
          placeholder={
            deviates
              ? "Why the actual preparation differs from the request"
              : "Restorative work, notes for viewing"
          }
          onChange={(event) =>
            patch(
              deviates
                ? { deviationNotes: event.target.value }
                : { remarks: event.target.value },
            )
          }
        />
      </Box>
    </>
  );
}
