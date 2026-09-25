"use client";

import { Box, Flex, Text } from "@chakra-ui/react";
import { BedDouble, UserRound } from "lucide-react";
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
            [
              "Trip type",
              doc.tripType === "viewing" ? "Outside chapel viewing" : "Retrieval",
            ],
            ["Pickup location", doc.pickup],
            ...(doc.destination ? [["Destination", doc.destination]] : []),
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
        color={C.onFill}
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

/** A titled group of rows, for screens that show more than one record. */
function Section({
  title,
  icon: Icon,
  rows,
}: {
  title: string;
  icon: typeof UserRound;
  rows: [string, string | undefined][];
}) {
  return (
    <Panel overflow="hidden">
      <Flex
        align="center"
        gap="8px"
        px="14px"
        py="10px"
        bg={C.tintBg}
        borderBottom="1px solid"
        borderColor={C.lineSoft}
        fontSize="12px"
        fontWeight={800}
        color={C.ink}>
        <Icon size={15} color={C.green} strokeWidth={2} />
        {title}
      </Flex>
      {rows.map(([label, value], index) => (
        <StackedRow
          key={label}
          label={label}
          value={value ?? "—"}
          last={index === rows.length - 1}
        />
      ))}
    </Panel>
  );
}

/**
 * What a casket barcode says: who is in the casket, and the room they lie in
 * state in — so staff can find or confirm a deceased without the paperwork.
 */
export function CasketDetailsScreen({ doc }: { doc: ServiceDoc }) {
  return (
    <>
      <Box
        borderRadius="14px"
        bg={C.green}
        color={C.onFill}
        textAlign="center"
        p="12px">
        <Text fontSize="12px" fontWeight={700} opacity={0.9}>
          {doc.docType}
        </Text>
        <Text fontSize="18px" fontWeight={800} fontFamily={MONO} mt="2px">
          {doc.code}
        </Text>
      </Box>
      <Section
        title="Deceased details"
        icon={UserRound}
        rows={[
          ["Name", doc.deceased],
          ["Date of birth · age", doc.dob],
          ["Date of death", doc.dod],
          ["Service ID", doc.caseId],
          ["Casket", doc.casket],
          ["Family contact", doc.contact && `${doc.contact} · ${doc.phone}`],
        ]}
      />
      <Section
        title="Room details"
        icon={BedDouble}
        rows={[
          ["Room", doc.room],
          ["Chapel", doc.chapel],
          ["Floor", doc.floor],
          ["Viewing", doc.viewing],
          ["Interment", doc.interment],
          ["Room status", doc.roomStatus],
        ]}
      />
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
