"use client";

import { Box, Flex, Grid, Text, chakra } from "@chakra-ui/react";
import { BODY_CONDITIONS, EMBALMERS, EMBALM_METHODS } from "./data";
import { C, field, fieldLabel } from "./theme";
import { Panel, Segmented } from "./chrome";

export type EmbalmForm = {
  embalmer: string;
  start: string;
  end: string;
  /** At least one method is required before the summary can be saved. */
  types: string[];
  fluid: string;
  volume: string;
  condition: string;
  effects: string;
  remarks: string;
};

export function emptyEmbalmForm(embalmer: string): EmbalmForm {
  return {
    embalmer,
    start: "",
    end: "",
    types: ["Arterial"],
    fluid: "",
    volume: "",
    condition: "Good",
    effects: "Yes",
    remarks: "",
  };
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
  value,
  onChange,
}: {
  name: string;
  meta: string;
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
        <FieldLabel>Embalmer</FieldLabel>
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

      <Box>
        <FieldLabel>Method</FieldLabel>
        <Flex gap="8px" wrap="wrap">
          {EMBALM_METHODS.map((method) => {
            const on = value.types.includes(method);
            return (
              <chakra.button
                key={method}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  patch({
                    types: on
                      ? value.types.filter((type) => type !== method)
                      : [...value.types, method],
                  })
                }
                h="36px"
                px="14px"
                borderRadius="18px"
                display="flex"
                alignItems="center"
                fontSize="12.5px"
                fontWeight={700}
                cursor="pointer"
                bg={on ? C.green : C.surface}
                color={on ? C.surface : C.inkSoft}
                border="1.5px solid"
                borderColor={on ? C.green : C.field}>
                {method}
              </chakra.button>
            );
          })}
        </Flex>
      </Box>

      <Grid templateColumns="1fr 96px" gap="10px">
        <Box>
          <FieldLabel>Fluid / chemical used</FieldLabel>
          <chakra.input
            {...field}
            value={value.fluid}
            placeholder="e.g. Formaldehyde 25 index"
            onChange={(event) => patch({ fluid: event.target.value })}
          />
        </Box>
        <Box>
          <FieldLabel>Volume (L)</FieldLabel>
          <chakra.input
            {...field}
            value={value.volume}
            inputMode="decimal"
            placeholder="8"
            onChange={(event) =>
              patch({ volume: event.target.value.replace(/[^\d.]/g, "") })
            }
          />
        </Box>
      </Grid>

      <Box>
        <FieldLabel>Body condition</FieldLabel>
        <chakra.select
          {...field}
          value={value.condition}
          onChange={(event) => patch({ condition: event.target.value })}>
          {BODY_CONDITIONS.map((condition) => (
            <option key={condition} value={condition}>
              {condition}
            </option>
          ))}
        </chakra.select>
      </Box>

      <Box>
        <FieldLabel>Personal effects removed and bagged</FieldLabel>
        <Segmented
          options={["Yes", "No"]}
          value={value.effects}
          onChange={(next) => patch({ effects: next })}
        />
      </Box>

      <Box>
        <FieldLabel>Remarks</FieldLabel>
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
