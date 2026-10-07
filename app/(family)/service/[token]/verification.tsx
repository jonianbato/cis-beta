"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Flex, Text, chakra } from "@chakra-ui/react";
import { useCodeScanner } from "@/lib/use-code-scanner";
import { playScanFeedback, unlockScanSound } from "@/lib/scan-feedback";
import {
  checkTag,
  confirmTag,
  getServiceHome,
  openService,
  type ServiceHome,
  type ServiceSummary,
  type TagDetails,
} from "./actions";
import {
  Card,
  Eyebrow,
  Heading,
  InstallLinkBanner,
  Logo,
  MONO,
  ManualEntry,
  OkStrip,
  P,
  PrimaryButton,
  Rows,
  SANS,
  Tick,
  Viewfinder,
  sleep,
} from "./family-ui";

type Step = "auth" | "scan" | "verify" | "review" | "done";

const PROGRESS = ["Identify", "Scan", "Review", "Done"];
const PROGRESS_AT: Record<Step, number> = {
  auth: 0,
  scan: 1,
  verify: 1,
  review: 2,
  done: 3,
};

// One-tap codes for trying the page without a printed tag, as the Scanner
// offers on its scan screens.
const TAG_SAMPLES = ["TAG-2026-000123", "TAG-2026-000124"];

/** How long each verification check shows before the next one starts. */
const CHECK_MS = 800;

/**
 * The way in: prove they know the deceased's last name, then scan and confirm
 * the toe tag. It stands alone, with no navigation — nothing behind it is
 * reachable until the toe tag is confirmed and the service home is released.
 */
export function Verification({
  token,
  returning,
  onOpened,
}: {
  token: string;
  /**
   * The toe tag was already scanned and reviewed in this browser: the name
   * opens the service home directly, so the scan steps are not shown.
   */
  returning: boolean;
  /** The service home, released once the toe tag is confirmed. */
  onOpened: (lastName: string, home: ServiceHome) => void;
}) {
  const [step, setStep] = useState<Step>("auth");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [service, setService] = useState<ServiceSummary | null>(null);

  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [manual, setManual] = useState("");
  const [scannedCode, setScannedCode] = useState("");
  const [checksDone, setChecksDone] = useState(0);
  const [tag, setTag] = useState<TagDetails | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [confirmedAt, setConfirmedAt] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  // The camera keeps reading frames while a code is being checked.
  const handling = useRef(false);

  useEffect(() => {
    document.addEventListener("pointerdown", unlockScanSound);
    return () => document.removeEventListener("pointerdown", unlockScanSound);
  }, []);

  const openHome = async (name: string) => {
    const result = await getServiceHome(token, name);
    if (result.ok) onOpened(name, result.home);
    return result.ok;
  };

  const submitName = async () => {
    const value = lastName.trim();
    if (!value) {
      setError("Please enter the last name.");
      return;
    }
    if (busy) return;
    setBusy(true);
    const result = await openService(token, value);
    if (!result.ok) {
      setBusy(false);
      setError(result.error);
      return;
    }
    setError("");
    setService(result.service);
    // A link already confirmed opens on the service home rather than asking
    // for the toe tag again.
    if (result.service.confirmedAt && (await openHome(value))) return;
    setBusy(false);
    // The camera starts with the step: a family member holding a phone over
    // the tag should not have to find a button below the viewfinder first.
    setScanning(true);
    setStep("scan");
  };

  /** Scan, then the design's three checks while the server does the real one. */
  const verify = async (raw: string) => {
    const code = raw.trim().toUpperCase();
    if (!code || handling.current) return;
    handling.current = true;
    setScanning(false);
    setScannedCode(code);
    setScanError("");
    setChecksDone(0);
    setStep("verify");

    const pending = checkTag(token, lastName, code);
    await sleep(CHECK_MS);
    setChecksDone(1);
    const result = await pending;
    await sleep(CHECK_MS);
    if (!result.ok) {
      playScanFeedback("error");
      setScanError(result.error);
      setStep("scan");
      handling.current = false;
      return;
    }
    playScanFeedback("ok");
    setChecksDone(2);
    await sleep(CHECK_MS);
    setChecksDone(3);
    await sleep(600);
    setTag(result.tag);
    setReviewed(false);
    setManual("");
    setStep("review");
    handling.current = false;
  };

  const confirm = async () => {
    if (!tag || !reviewed || busy) return;
    setBusy(true);
    const result = await confirmTag(token, lastName, tag.code);
    setBusy(false);
    if (!result.ok) {
      setScanError(result.error);
      setStep("scan");
      return;
    }
    setConfirmedAt(result.confirmedAt);
    setStep("done");
  };

  const { camera, retry } = useCodeScanner({
    videoRef,
    active: step === "scan" && scanning,
    onCode: (raw) => void verify(raw),
  });

  const caseId = service?.caseId ?? "";
  const progressAt = PROGRESS_AT[step];
  const checks: [string, string][] = [
    ["Reading QR code", scannedCode || "—"],
    ["Comparing with service link", caseId],
    ["Verifying toe tag match", "tag ↔ service"],
  ];

  return (
    <Flex direction="column" minH="100dvh" bg={P.page} color={P.text} fontFamily={SANS}>
      <Box
        bg={P.surface}
        borderBottom={`1px solid ${P.header}`}
        position="sticky"
        top="0"
        zIndex={2}
        pt="env(safe-area-inset-top, 0px)">
        <Flex as="header" maxW="960px" mx="auto" px="16px" py="12px" align="center" gap="10px">
          <Logo />
          <Flex flex="1" direction="column" gap="2px" minW="0">
            <Text fontWeight={700} fontSize="16px" color={P.ink}>
              One St. Peter
            </Text>
            <Text fontSize="10px" letterSpacing=".14em" fontWeight={500} color={P.ink}>
              FAMILY SERVICE LINK
            </Text>
          </Flex>
          {caseId && (
            <Text
              fontFamily={MONO}
              fontSize="11px"
              color={P.sage}
              bg={P.chip}
              border={`1px solid ${P.chipLine}`}
              px="8px"
              py="4px"
              borderRadius="6px"
              flexShrink={0}>
              {caseId}
            </Text>
          )}
        </Flex>
        {!(returning && step === "auth") && (
          <Flex maxW="560px" mx="auto" px="20px" pb="14px" gap="6px">
            {PROGRESS.map((label, index) => (
              <Flex key={label} flex="1" direction="column" gap="6px">
                <Box h="4px" borderRadius="2px" bg={index <= progressAt ? P.greenDot : P.bar} />
                <Text
                  fontSize="11px"
                  fontWeight={index === progressAt ? 600 : 400}
                  color={index <= progressAt ? P.ink : P.faint}>
                  {label}
                </Text>
              </Flex>
            ))}
          </Flex>
        )}
      </Box>

      <Flex
        as="main"
        flex="1"
        w="full"
        maxW="560px"
        mx="auto"
        px="20px"
        pt="28px"
        pb="32px"
        direction="column"
        gap="20px">
        {step === "auth" && (
          <Flex direction="column" gap="20px" flex="1">
            <Heading
              title="Toe tag verification"
              body="We'll help you confirm your loved one's identity before the viewing. To protect their privacy, please enter the deceased's last name."
            />
            <chakra.label display="flex" flexDirection="column" gap="8px">
              <Text as="span" fontSize="13px" fontWeight={600} color={P.ink}>
                Deceased last name
              </Text>
              <chakra.input
                value={lastName}
                onChange={(event) => {
                  setLastName(event.target.value);
                  setError("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void submitName();
                }}
                placeholder="Last name"
                autoComplete="off"
                autoCapitalize="words"
                spellCheck={false}
                aria-invalid={!!error}
                h="52px"
                borderRadius="12px"
                border="1.5px solid"
                borderColor={error ? P.errField : P.field}
                bg={P.surface}
                px="16px"
                fontSize="16px"
                fontFamily="inherit"
                color={P.text}
                outline="none"
                _focusVisible={{ borderColor: error ? P.errField : P.green }}
              />
              {error && (
                <Text as="span" fontSize="13px" color={P.errText} lineHeight="1.45" role="alert">
                  {error}
                </Text>
              )}
            </chakra.label>
            <Card borderRadius="12px" px="16px" py="14px">
              <Text fontSize="13px" lineHeight="1.5" color={P.body}>
                This link was sent to the registered contracting party for this
                service. It can only be used for this service.
              </Text>
            </Card>
            <InstallLinkBanner token={token} />
            <Box flex="1" />
            <PrimaryButton onClick={() => void submitName()} disabled={busy}>
              {busy ? "Checking…" : "Continue"}
            </PrimaryButton>
          </Flex>
        )}

        {step === "scan" && (
          <Flex direction="column" gap="20px" flex="1">
            <Heading
              title="Scan the toe tag"
              body="Point your camera at the QR code on the toe tag or casket. A St. Peter staff member will assist you."
            />
            <Viewfinder
              videoRef={videoRef}
              live={scanning}
              camera={camera}
              aspect="1 / 1"
              frame="qr"
              idleLabel={scanError ? "camera paused" : "camera feed"}
              onRetry={retry}
            />
            {scanError && (
              <Flex
                direction="column"
                gap="4px"
                bg={P.errBg}
                border={`1px solid ${P.errLine}`}
                borderRadius="12px"
                px="16px"
                py="14px"
                role="alert">
                <Text fontSize="14px" fontWeight={600} color={P.errTitle}>
                  Toe tag does not match
                </Text>
                <Text fontSize="13px" lineHeight="1.5" color={P.errBody}>
                  {scanError}
                </Text>
              </Flex>
            )}
            <ManualEntry
              id="family-tag-code"
              value={manual}
              onChange={setManual}
              onSubmit={() => void verify(manual)}
              placeholder="TAG-…"
              samples={TAG_SAMPLES}
              onSample={(code) => void verify(code)}
            />
            <Box flex="1" />
            {/* After a mismatch the camera waits here, so it does not keep
                re-reading the wrong tag that is still in front of it. */}
            <PrimaryButton onClick={() => setScanning(true)} disabled={scanning}>
              {scanning
                ? "Scanning… hold the QR in the frame"
                : scanError
                  ? "Scan again"
                  : "Scan QR code"}
            </PrimaryButton>
          </Flex>
        )}

        {step === "verify" && (
          <Flex direction="column" gap="20px" flex="1">
            <Heading title="Verifying…" body="Checking the scanned tag against this service's records." />
            <Card px="16px" py="6px" role="status" aria-live="polite">
              {checks.map(([label, detail], index) => {
                const done = index < checksDone;
                const active = index === checksDone;
                return (
                  <Flex
                    key={label}
                    align="center"
                    gap="12px"
                    py="14px"
                    borderBottom={index < checks.length - 1 ? `1px solid ${P.lineSoft}` : "0"}>
                    <Flex
                      w="22px"
                      h="22px"
                      borderRadius="50%"
                      bg={done ? P.greenDot : P.surface}
                      border="2px solid"
                      borderColor={done ? P.greenDot : active ? P.greenBright : P.ring}
                      align="center"
                      justify="center"
                      color={P.onFill}
                      fontSize="12px"
                      fontWeight={700}
                      flexShrink={0}>
                      {done ? "✓" : ""}
                    </Flex>
                    <Flex flex="1" direction="column" gap="2px">
                      <Text fontSize="14px" fontWeight={500} color={done || active ? P.text : P.faint}>
                        {label}
                      </Text>
                      <Text fontFamily={MONO} fontSize="11px" color={P.muted}>
                        {done ? detail : active ? "checking…" : "pending"}
                      </Text>
                    </Flex>
                  </Flex>
                );
              })}
            </Card>
          </Flex>
        )}

        {step === "review" && tag && (
          <Flex direction="column" gap="18px" flex="1">
            <OkStrip>Toe tag matches this service</OkStrip>
            <Flex direction="column" gap="6px">
              <chakra.h1 m="0" fontSize="22px" fontWeight={700} color={P.ink}>
                Please review
              </chakra.h1>
              <Text fontSize="14px" lineHeight="1.55" color={P.body} css={{ textWrap: "pretty" }}>
                Take your time. Confirm that the photos and toe tag details belong
                to your loved one.
              </Text>
            </Flex>
            <Card overflow="hidden">
              <Box position="relative" w="full" css={{ aspectRatio: "331 / 200" }} bg={P.photo}>
                {/* eslint-disable-next-line @next/next/no-img-element -- the record's photo, shown as captured */}
                <img
                  src={tag.photoUrl}
                  alt="Captured photo of deceased with toe tag"
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
                  Captured at toe tagging
                </Text>
              </Box>
              <Flex px="16px" py="18px" direction="column" gap="4px">
                <Eyebrow>DECEASED</Eyebrow>
                <Text fontSize="20px" fontWeight={700} color={P.ink} css={{ textWrap: "pretty" }}>
                  {tag.deceased}
                </Text>
                <Text fontSize="13px" color={P.body}>
                  {tag.life}
                </Text>
              </Flex>
              <Flex
                mx="16px"
                px="16px"
                py="14px"
                borderRadius="12px"
                bg={P.chip}
                border={`1px dashed ${P.dashed}`}
                direction="column"
                gap="4px">
                <Eyebrow>TOE TAG NO.</Eyebrow>
                <Text fontFamily={MONO} fontSize="22px" fontWeight={500} color={P.ink} letterSpacing=".04em">
                  {tag.code}
                </Text>
              </Flex>
              <Box px="16px" py="8px">
                <Rows
                  py="10px"
                  rows={[
                    ["Service ID", tag.caseId],
                  ]}
                />
              </Box>
            </Card>
            <chakra.label display="flex" gap="12px" alignItems="flex-start" cursor="pointer" py="4px">
              <chakra.input
                type="checkbox"
                checked={reviewed}
                onChange={() => setReviewed((value) => !value)}
                w="20px"
                h="20px"
                mt="1px"
                flexShrink={0}
                css={{ accentColor: P.green }}
              />
              <Text as="span" fontSize="14px" lineHeight="1.5" color={P.text}>
                I have reviewed the photos and toe tag details and confirm they are
                correct.
              </Text>
            </chakra.label>
            <PrimaryButton caps onClick={() => void confirm()} disabled={!reviewed || busy}>
              {busy ? "CONFIRMING…" : "CONFIRM TOE TAG"}
            </PrimaryButton>
            <Text fontSize="12px" textAlign="center" color={P.muted} lineHeight="1.5">
              Something doesn&apos;t look right? Please speak with the chapel staff.
            </Text>
          </Flex>
        )}

        {step === "done" && (
          <Flex direction="column" gap="20px" flex="1" align="center" textAlign="center" pt="40px">
            <Flex
              w="72px"
              h="72px"
              borderRadius="50%"
              bg={P.okBg}
              border={`1px solid ${P.okLine}`}
              align="center"
              justify="center">
              <Tick size={44} />
            </Flex>
            <Heading
              title="Verification complete"
              body={`Thank you. You've confirmed the toe tag for ${
                tag?.deceased ?? service?.deceased ?? "your loved one"
              }. Our staff will proceed with the next arrangements.`}
            />
            <Card w="full" px="16px" py="6px" textAlign="left">
              <Rows
                rows={[
                  ["Toe tag no.", tag?.code ?? "—"],
                  ["Service ID", caseId],
                  ["Confirmed", confirmedAt],
                ]}
              />
            </Card>
            <Box flex="1" />
            <PrimaryButton
              w="full"
              onClick={async () => {
                setBusy(true);
                if (!(await openHome(lastName))) setBusy(false);
              }}
              disabled={busy}>
              {busy ? "Opening…" : "Continue to service home"}
            </PrimaryButton>
          </Flex>
        )}
      </Flex>
    </Flex>
  );
}
