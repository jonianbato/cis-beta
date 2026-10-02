"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Box, Flex, Grid, Text, chakra } from "@chakra-ui/react";
import { FileText } from "lucide-react";
import { DashboardHeaderMobile } from "osp-ui-kit";
import { useCodeScanner } from "@/lib/use-code-scanner";
import { playScanFeedback, unlockScanSound } from "@/lib/scan-feedback";
import {
  checkCasket,
  confirmStep,
  resetDemo,
  submitDocument,
  type StepId,
} from "./actions";
import { FAMILY_DOCS, useFamily } from "./family-context";
import {
  Card,
  Eyebrow,
  InstallLinkBanner,
  MONO,
  ManualEntry,
  OkStrip,
  P,
  PrimaryButton,
  Rows,
  SANS,
  Viewfinder,
} from "./family-ui";

type SheetId = "embalm" | "casket" | "delivered";
type SheetScan = "idle" | "scanning" | "checking" | "ok";

/** The later authorizations, after the toe tag, in the order they unlock. */
const ACTIONS: {
  id: SheetId;
  title: string;
  desc: string;
  cta: string;
  btn: string;
  body: string;
  consent: string;
}[] = [
  {
    id: "embalm",
    title: "Confirm embalming outcome & casket design",
    desc: "Review the embalming result and chosen casket before encasketing.",
    cta: "Review & confirm",
    btn: "CONFIRM",
    body: "Please confirm you are satisfied with the embalming outcome and the casket design. Encasketing will begin after your confirmation.",
    consent:
      "I confirm the embalming outcome and casket design, and authorize encasketing.",
  },
  {
    id: "casket",
    title: "Confirm casket before viewing",
    desc: "Scan the casket barcode to confirm the casket and deceased information before the viewing opens.",
    cta: "Scan casket barcode",
    btn: "CONFIRM CASKET",
    body: "Scan the barcode on the casket. We will match it with the deceased information for this service.",
    consent:
      "I confirm the casket and deceased information are correct. The viewing may begin.",
  },
  {
    id: "delivered",
    title: "Confirm arrival at viewing venue",
    desc: "Confirm that your loved one has been brought to the viewing venue.",
    cta: "Review & confirm",
    btn: "CONFIRM ARRIVAL",
    body: "Our team has brought your loved one from the chapel to the viewing venue. Please confirm once the casket has arrived and been received by your family.",
    consent:
      "I confirm my loved one has been brought to the viewing venue and received by our family.",
  },
];

// One-tap casket codes, as on the toe tag step.
const CASKET_SAMPLES = ["CK-2026-000123", "CK-2026-000124"];

/** Uploads read "Under review" this long on the server; refresh just after. */
const REVIEW_REFRESH_MS = 2700;

/** The family pages' own type and colors, inside the app's layout. */
export function FamilyPage({ children }: { children: React.ReactNode }) {
  return (
    <Box
      fontFamily={SANS}
      color={P.text}
      w="full"
      maxW="960px"
      mx="auto"
      px={{ base: "16px", lg: "24px" }}
      py={{ base: "16px", lg: "24px" }}
      css={{ "& button": { fontFamily: "inherit" } }}>
      {children}
    </Box>
  );
}

/** The documents the chapel office needs, uploaded from the family's phone. */
export function DocumentsCard() {
  const { token, lastName, home, refresh } = useFamily();
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const count = Object.keys(home.docs).length;

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const upload = async (docId: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const result = await submitDocument(token, lastName, docId, file.name);
    if (!result.ok) return;
    await refresh();
    // The review clears on the server after a moment; pick that up.
    timers.current.push(setTimeout(() => void refresh(), REVIEW_REFRESH_MS));
  };

  return (
    <Card display="flex" flexDirection="column">
      <Flex px="18px" pt="18px" pb="6px" justify="space-between" align="baseline" gap="12px">
        <chakra.h2 m="0" fontSize="16px" fontWeight={700} color={P.ink}>
          Required documents
        </chakra.h2>
        <Text fontSize="12px" color={P.sage}>
          {count} of {FAMILY_DOCS.length} submitted
        </Text>
      </Flex>
      {FAMILY_DOCS.map((doc) => {
        const sent = home.docs[doc.id];
        return (
          <Flex key={doc.id} gap="14px" px="18px" py="16px" borderTop={`1px solid ${P.lineSoft}`} align="center">
            <Flex
              w="36px"
              h="44px"
              flexShrink={0}
              borderRadius="6px"
              bg={P.chip}
              border={`1px solid ${P.chipLine}`}
              align="center"
              justify="center"
              color={P.sage}>
              <FileText size={18} strokeWidth={1.8} />
            </Flex>
            <Flex flex="1" direction="column" gap="4px" minW="0">
              <Text fontSize="14px" fontWeight={600} color={P.text}>
                {doc.name}
              </Text>
              <Text fontSize="12px" color={P.muted} overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                {sent ? sent.file : doc.sub}
              </Text>
            </Flex>
            {sent ? (
              <Text
                as="span"
                fontSize="11px"
                fontWeight={600}
                px="8px"
                py="3px"
                borderRadius="999px"
                whiteSpace="nowrap"
                bg={sent.status === "ok" ? P.okBg : P.reviewBg}
                color={sent.status === "ok" ? P.okInk : P.reviewInk}>
                {sent.status === "ok" ? "Accepted" : "Under review"}
              </Text>
            ) : (
              <chakra.label
                h="40px"
                px="14px"
                borderRadius="10px"
                border={`1.5px solid ${P.green}`}
                color={P.green}
                fontSize="13px"
                fontWeight={600}
                display="flex"
                alignItems="center"
                cursor="pointer"
                flexShrink={0}
                _hover={{ bg: P.okBg }}>
                Upload
                <chakra.input
                  type="file"
                  accept="image/*,.pdf"
                  aria-label={`Upload ${doc.name}`}
                  onChange={(event) => void upload(doc.id, event)}
                  display="none"
                />
              </chakra.label>
            )}
          </Flex>
        );
      })}
      <Text
        px="18px"
        pt="14px"
        pb="18px"
        borderTop={`1px solid ${P.lineSoft}`}
        fontSize="12px"
        lineHeight="1.5"
        color={P.muted}>
        Clear photo or PDF, up to 10 MB. Originals may be requested at the chapel
        office.
      </Text>
    </Card>
  );
}

/**
 * The service home: who the service is for, the authorizations still waiting
 * on the family, and the documents the chapel needs.
 */
export function ServiceHomePage() {
  const { token, lastName, home, refresh, signOut } = useFamily();

  const [sheet, setSheet] = useState<SheetId | null>(null);
  const [checked, setChecked] = useState(false);
  const [scan, setScan] = useState<SheetScan>("idle");
  const [manual, setManual] = useState("");
  const [error, setError] = useState("");
  const [casketCode, setCasketCode] = useState("");
  const [casketRows, setCasketRows] = useState<[string, string][]>([]);
  const [busy, setBusy] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const handling = useRef(false);

  useEffect(() => {
    document.addEventListener("pointerdown", unlockScanSound);
    return () => document.removeEventListener("pointerdown", unlockScanSound);
  }, []);

  const steps = [
    {
      id: "tag" as StepId,
      title: "Toe tagging",
      desc: `Authorize to attach toe tag ${home.tag} and retrieve the deceased to the chapel.`,
      cta: "",
      stampPrefix: "Toe tag verified ",
    },
    ...ACTIONS.filter(
      // Only a wake held outside the chapel has an arrival to confirm.
      (action) => action.id !== "delivered" || !!home.viewingTrip,
    ).map((action) => ({ ...action, stampPrefix: "Confirmed " })),
  ];
  const nextIdx = steps.findIndex((item) => !home.done[item.id]);
  const doneCount = steps.filter((item) => home.done[item.id]).length;
  const sheetDef = ACTIONS.find((action) => action.id === sheet);

  const open = (id: SheetId) => {
    setSheet(id);
    setChecked(false);
    setError("");
    setManual("");
    setCasketCode("");
    setCasketRows([]);
    // The casket sheet opens with the camera running, as the toe tag scan does.
    setScan(id === "casket" ? "scanning" : "idle");
  };

  const close = () => {
    setSheet(null);
    setScan("idle");
  };

  const scanCasket = async (raw: string) => {
    const code = raw.trim().toUpperCase();
    if (!code || handling.current) return;
    handling.current = true;
    setScan("checking");
    setError("");
    const result = await checkCasket(token, lastName, code);
    handling.current = false;
    if (!result.ok) {
      playScanFeedback("error");
      setError(result.error);
      setScan("idle");
      return;
    }
    playScanFeedback("ok");
    setCasketCode(code);
    setCasketRows(result.rows);
    setManual("");
    setScan("ok");
  };

  const authorize = async () => {
    if (!sheet || !checked || busy) return;
    setBusy(true);
    const result = await confirmStep(token, lastName, sheet, casketCode);
    if (!result.ok) {
      setBusy(false);
      setError(result.error);
      return;
    }
    await refresh();
    setBusy(false);
    setSheet(null);
  };

  const { camera, retry } = useCodeScanner({
    videoRef,
    active: sheet === "casket" && scan === "scanning",
    onCode: (raw) => void scanCasket(raw),
  });

  return (
    <>
      {/* Mobile-only: the kit hides this from lg up, where the app header
          and sidebar already carry the branding. */}
      <DashboardHeaderMobile title="One St. Peter" subtitle="Family Service Link" />
      <FamilyPage>
        <Flex direction="column" gap="20px">
          <InstallLinkBanner token={token} />
          <Card p="20px" display="flex" flexDirection="column" gap="14px">
            <Flex direction="column" gap="4px">
              <Eyebrow>IN LOVING MEMORY</Eyebrow>
              <chakra.h1 m="0" fontSize="22px" fontWeight={700} color={P.ink} css={{ textWrap: "pretty" }}>
                {home.deceased}
              </chakra.h1>
              <Text fontSize="14px" color={P.body}>
                {home.life}
              </Text>
            </Flex>
            <Flex wrap="wrap" columnGap="20px" rowGap="8px" fontSize="13px" color={P.body}>
              <Text as="span">{home.chapel}</Text>
              <Text as="span" fontFamily={MONO} fontSize="12px">
                {home.caseId}
              </Text>
            </Flex>
          </Card>

          <Grid templateColumns="repeat(auto-fit, minmax(min(100%, 360px), 1fr))" gap="20px" alignItems="start">
            <Card display="flex" flexDirection="column">
              <Flex px="18px" pt="18px" pb="6px" justify="space-between" align="baseline" gap="12px">
                <chakra.h2 m="0" fontSize="16px" fontWeight={700} color={P.ink}>
                  Authorization steps
                </chakra.h2>
                <Text fontSize="12px" color={P.sage}>
                  {doneCount} of {steps.length} complete
                </Text>
              </Flex>
              {steps.map((item, index) => {
                const at = home.done[item.id];
                const done = !!at;
                const next = index === nextIdx;
                return (
                  <Flex key={item.id} gap="14px" px="18px" py="16px" borderTop={`1px solid ${P.lineSoft}`}>
                    <Flex
                      w="28px"
                      h="28px"
                      flexShrink={0}
                      borderRadius="50%"
                      bg={done ? P.greenDot : P.surface}
                      border="2px solid"
                      borderColor={done || next ? P.greenDot : P.ring}
                      align="center"
                      justify="center"
                      fontSize="12px"
                      fontWeight={700}
                      color={done ? P.onFill : next ? P.green : P.faint}>
                      {done ? "✓" : index + 1}
                    </Flex>
                    <Flex flex="1" direction="column" gap="6px" minW="0">
                      <Flex justify="space-between" gap="10px" align="flex-start">
                        <Text fontSize="14px" fontWeight={600} color={done || next ? P.text : P.muted}>
                          {item.title}
                        </Text>
                        <Text
                          as="span"
                          fontSize="11px"
                          fontWeight={600}
                          px="8px"
                          py="3px"
                          borderRadius="999px"
                          whiteSpace="nowrap"
                          bg={done ? P.okBg : next ? P.warnBg : P.idleBg}
                          color={done ? P.okInk : next ? P.warnInk : P.muted}>
                          {done ? "Done" : next ? "Action needed" : "Upcoming"}
                        </Text>
                      </Flex>
                      <Text fontSize="13px" lineHeight="1.5" color={P.body}>
                        {item.desc}
                      </Text>
                      {done && (
                        <Text fontSize="12px" color={P.green}>
                          {item.stampPrefix}
                          {at}
                        </Text>
                      )}
                      {next && item.cta && (
                        <chakra.button
                          type="button"
                          onClick={() => open(item.id as SheetId)}
                          h="44px"
                          px="18px"
                          border="0"
                          borderRadius="12px"
                          bg={P.green}
                          color={P.onFill}
                          fontSize="14px"
                          fontWeight={600}
                          cursor="pointer"
                          alignSelf="flex-start"
                          mt="4px"
                          _hover={{ bg: P.greenHover }}>
                          {item.cta}
                        </chakra.button>
                      )}
                    </Flex>
                  </Flex>
                );
              })}
            </Card>

            <DocumentsCard />
          </Grid>

          {/* Clears this service so the demo can be run again. */}
          <chakra.button
            type="button"
            onClick={async () => {
              await resetDemo(token, lastName);
              signOut();
            }}
            alignSelf="center"
            h="40px"
            px="16px"
            border={`1px solid ${P.field}`}
            borderRadius="12px"
            bg={P.surface}
            color={P.green}
            fontSize="13px"
            fontWeight={600}
            cursor="pointer">
            Restart demo
          </chakra.button>
        </Flex>
      </FamilyPage>

      {sheet && sheetDef && (
        <Flex
          position="fixed"
          inset="0"
          bg={P.scrim}
          align="flex-end"
          justify="center"
          // Above the shell's bottom bar and floating buttons.
          zIndex={1500}
          fontFamily={SANS}
          onClick={close}>
          <Flex
            role="dialog"
            aria-modal="true"
            aria-label={sheetDef.title}
            onClick={(event) => event.stopPropagation()}
            w="full"
            maxW="560px"
            maxH="90vh"
            overflowY="auto"
            bg={P.surface}
            color={P.text}
            borderRadius="20px 20px 0 0"
            px="20px"
            pt="24px"
            pb="calc(28px + env(safe-area-inset-bottom, 0px))"
            direction="column"
            gap="16px"
            css={{ "& button": { fontFamily: "inherit" } }}>
            <Flex direction="column" gap="6px">
              <Eyebrow>AUTHORIZATION</Eyebrow>
              <chakra.h2 m="0" fontSize="20px" fontWeight={700} color={P.ink}>
                {sheetDef.title}
              </chakra.h2>
              <Text fontSize="14px" lineHeight="1.55" color={P.body} css={{ textWrap: "pretty" }}>
                {sheetDef.body}
              </Text>
            </Flex>

            {sheet === "casket" && scan !== "ok" && (
              <Flex direction="column" gap="14px">
                <Viewfinder
                  videoRef={videoRef}
                  live={scan === "scanning"}
                  camera={camera}
                  aspect="16 / 10"
                  frame="barcode"
                  idleLabel="align casket barcode"
                  onRetry={retry}
                />
                {error && (
                  <Text fontSize="13px" color={P.errText} lineHeight="1.45" role="alert">
                    {error}
                  </Text>
                )}
                <PrimaryButton onClick={() => setScan("scanning")} disabled={scan !== "idle"}>
                  {scan !== "idle" ? "Scanning…" : error ? "Scan again" : "Scan barcode"}
                </PrimaryButton>
                <ManualEntry
                  id="family-casket-code"
                  value={manual}
                  onChange={setManual}
                  onSubmit={() => void scanCasket(manual)}
                  placeholder="CK-…"
                  samples={CASKET_SAMPLES}
                  onSample={(code) => void scanCasket(code)}
                />
              </Flex>
            )}

            {(sheet !== "casket" || scan === "ok") && (
              <Flex direction="column" gap="16px">
                {sheet === "casket" && <OkStrip>Casket barcode matches this service</OkStrip>}

                {sheet === "embalm" && (
                  <>
                    <Box position="relative" w="full" css={{ aspectRatio: "331 / 200" }} borderRadius="12px" overflow="hidden" bg={P.photo}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- the record's photo, shown as captured */}
                      <img
                        src={home.embalming.photoUrl}
                        alt="Photo of the deceased after embalming"
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                      <Text
                        position="absolute"
                        left="10px"
                        bottom="10px"
                        fontSize="11px"
                        fontWeight={600}
                        color={P.onFill}
                        bg="rgba(16,41,29,.72)"
                        px="8px"
                        py="4px"
                        borderRadius="6px">
                        After embalming · {home.embalming.completed}
                      </Text>
                    </Box>
                    <Box border={`1px solid ${P.line}`} borderRadius="12px" overflow="hidden">
                      <Flex px="14px" py="12px" bg={P.chip} borderBottom={`1px solid ${P.line}`} direction="column" gap="2px">
                        <Text fontSize="13px" fontWeight={700} color={P.ink}>
                          Requested vs actual
                        </Text>
                        <Text fontSize="12px" color={P.muted}>
                          Recorded by the embalmer
                        </Text>
                      </Flex>
                      <Grid
                        templateColumns="minmax(0,1.2fr) minmax(0,1fr) minmax(0,1fr)"
                        gap="8px"
                        px="14px"
                        py="8px"
                        fontSize="11px"
                        letterSpacing=".08em"
                        fontWeight={600}
                        color={P.muted}>
                        <span>ITEM</span>
                        <span>REQUESTED</span>
                        <span>ACTUAL</span>
                      </Grid>
                      {home.embalming.rows.map(([item, requested, actual]) => (
                        <Grid
                          key={item}
                          templateColumns="minmax(0,1.2fr) minmax(0,1fr) minmax(0,1fr)"
                          gap="8px"
                          px="14px"
                          py="10px"
                          borderTop={`1px solid ${P.lineSoft}`}
                          alignItems="center">
                          <Text fontSize="13px" fontWeight={600} color={P.text}>
                            {item}
                          </Text>
                          <Text fontSize="13px" color={P.body}>
                            {requested}
                          </Text>
                          <Text fontSize="13px" fontWeight={600} color={requested === actual ? P.green : P.errText}>
                            {actual}
                          </Text>
                        </Grid>
                      ))}
                    </Box>
                    <Box border={`1px solid ${P.line}`} borderRadius="12px" px="14px" py="4px">
                      <Rows
                        py="10px"
                        rows={[
                          ["Embalming outcome", home.embalming.outcome],
                          ["Remarks", home.embalming.remarks],
                        ]}
                        inkOf={(index) => (index === 0 ? P.green : P.text)}
                      />
                    </Box>
                  </>
                )}

                <Box border={`1px solid ${P.line}`} borderRadius="12px" px="14px" py="4px">
                  <Rows
                    py="10px"
                    rows={
                      sheet === "embalm"
                        ? [
                            ["Embalmer", home.embalming.embalmer],
                            ["Embalming", `Completed ${home.embalming.completed}`],
                            ["Casket design", home.embalming.casketDesign],
                          ]
                        : sheet === "delivered"
                          ? (home.viewingTrip?.rows ?? [])
                          : casketRows
                    }
                  />
                </Box>

                <chakra.label display="flex" gap="12px" alignItems="flex-start" cursor="pointer">
                  <chakra.input
                    type="checkbox"
                    checked={checked}
                    onChange={() => setChecked((value) => !value)}
                    w="20px"
                    h="20px"
                    mt="1px"
                    flexShrink={0}
                    css={{ accentColor: P.green }}
                  />
                  <Text as="span" fontSize="14px" lineHeight="1.5" color={P.text}>
                    {sheetDef.consent}
                  </Text>
                </chakra.label>
                {/* Only the casket sheet scans first; the others show errors as they come. */}
                {error && (sheet !== "casket" || scan === "ok") && (
                  <Text fontSize="13px" color={P.errText} role="alert">
                    {error}
                  </Text>
                )}
                <PrimaryButton caps onClick={() => void authorize()} disabled={!checked || busy}>
                  {busy ? "CONFIRMING…" : sheetDef.btn}
                </PrimaryButton>
              </Flex>
            )}

            <chakra.button
              type="button"
              onClick={close}
              h="44px"
              border="0"
              bg="transparent"
              color={P.body}
              fontSize="14px"
              fontWeight={500}
              cursor="pointer">
              Not now
            </chakra.button>
          </Flex>
        </Flex>
      )}
    </>
  );
}
