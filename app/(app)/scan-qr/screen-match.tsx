"use client";

import { Box, Text } from "@chakra-ui/react";
import type { ServiceDoc } from "./data";
import { C, MONO } from "./theme";
import { InlineRow, Outcome, Panel, StackedRow } from "./chrome";

/** What the first scanned document turned out to be. */
export function DetailsScreen({ doc }: { doc: ServiceDoc }) {
  const rows =
    doc.kind === "embalm"
      ? [
          ["Deceased name", doc.deceased],
          ["Service ID", doc.caseId],
          ["Preparation room", doc.prepRoom],
          ["Embalmer", doc.embalmer],
          ["Scheduled", doc.scheduled],
        ]
      : doc.kind === "trip"
        ? [
            ["Deceased name", doc.deceased],
            ["Service ID", doc.caseId],
            ["Pickup location", doc.pickup],
            ["Vehicle", doc.vehicle],
            ["Driver", doc.driver],
            ["Departure", doc.departure],
          ]
        : [
            ["Document", doc.docType],
            ["Deceased name", doc.deceased],
            ["Service ID", doc.caseId],
          ];

  return (
    <>
      <Box
        borderRadius="14px"
        bg={C.green}
        color={C.surface}
        textAlign="center"
        p="11px"
        fontSize="16px"
        fontWeight={800}
        fontFamily={MONO}>
        {doc.code}
      </Box>
      <Panel overflow="hidden">
        {rows.map(([label, value], index) => (
          <StackedRow
            key={label}
            label={label as string}
            value={value ?? "—"}
            last={index === rows.length - 1}
          />
        ))}
      </Panel>
    </>
  );
}

/**
 * The verdict on two scanned documents. A mismatch flags the second document's
 * rows, because the first is what the operator trusted when they started.
 */
export function ResultScreen({
  first,
  second,
  matched,
}: {
  first: ServiceDoc;
  second: ServiceDoc;
  matched: boolean;
}) {
  const rows: [string, string | undefined, boolean][] = [
    [first.docType, first.code, false],
    ["Deceased", first.deceased, false],
    ["Service ID", first.caseId, false],
    [second.docType, second.code, !matched],
    ["Deceased", second.deceased, !matched],
    ["Service ID", second.caseId, !matched],
  ];

  return (
    <>
      <Outcome ok={matched} title={matched ? "MATCH" : "MISMATCH"}>
        {matched
          ? `${first.docType} and ${second.docType} belong to the same deceased. You may proceed.`
          : `${first.docType} and ${second.docType} belong to different services. Do not proceed.`}
      </Outcome>
      <Panel overflow="hidden">
        {rows.map(([label, value, bad], index) => (
          <InlineRow
            key={`${label}-${index}`}
            label={label}
            value={value ?? "—"}
            bad={bad}
            last={index === rows.length - 1}
          />
        ))}
      </Panel>
    </>
  );
}

/** A plain centred note, used where a screen is only an instruction. */
export function ScreenNote({ children }: { children: React.ReactNode }) {
  return (
    <Text fontSize="12.5px" color={C.muted} lineHeight="1.5">
      {children}
    </Text>
  );
}
