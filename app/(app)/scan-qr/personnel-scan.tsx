"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Flex } from "@chakra-ui/react";
import { Page } from "osp-ui-kit";
import { useCodeScanner } from "@/lib/use-code-scanner";
import { playScanFeedback, unlockScanSound } from "@/lib/scan-feedback";
import {
  DEMO_OTP,
  DESTINATION_CHAPEL,
  OTP_TTL_MS,
  PIPELINES,
  embalmerFor,
  findTagCode,
  findTripCode,
  lookupDoc,
  sampleCodes,
  type Pipeline,
  type PipelineStep,
  type ScanKind,
  type ServiceDoc,
  type TaskScreen,
} from "./data";
import {
  FlowFooter,
  FlowProgress,
  Outcome,
  Toast,
  type FooterAction,
} from "./chrome";
import { HomeScreen, type LogEntry } from "./screen-home";
import { useFlowHistory } from "./use-flow-history";
import { ScanScreen } from "./screen-scan";
import {
  CasketDetailsScreen,
  DetailsScreen,
  ResultScreen,
} from "./screen-match";
import {
  AuthorizeScreen,
  MoveScreen,
  OtpScreen,
  ProcessScreen,
  ReviewScreen,
} from "./screen-steps";
import { CasketScreen, PhotoScreen } from "./screen-capture";
import { EmbalmScreen, emptyEmbalmForm, type EmbalmForm } from "./screen-embalm";

type Screen =
  | "home"
  | "scanLookup"
  | "casketDetails"
  | "scanTrip"
  | "tripDetails"
  | "scanTag"
  | "result"
  | "scanProcess"
  | "processPick"
  | "checkTrip"
  | "checkTag"
  | "scanAttach"
  | "scanCasket"
  | "casket"
  | "photo"
  | "review"
  | "authorize"
  | "otp"
  | "final"
  | "depart"
  | "arrive"
  | "embalm";

type FlowState = {
  screen: Screen;
  manual: string;
  scanError: string;
  /** The code accepted on the current scan screen; blank re-arms detection. */
  scanned: string;
  /** The service in hand: a trip ticket, or the embalming ticket for one. */
  trip: ServiceDoc | null;
  tag: ServiceDoc | null;
  photoUrl: string;
  otp: string;
  otpSentAt: number;
  otpFail: "" | "expired" | "invalid";
  pipeline: Pipeline | "";
  /** Which step of the pipeline is open, and how far into its task list. */
  stepKey: string;
  taskIdx: number;
  casketTag: string;
  casketPlaced: string;
  departedAt: string;
  em: EmbalmForm;
  /** `pipeline:caseId` -> step key -> the time that step was authorized. */
  progress: Record<string, Record<string, string>>;
  embalmRecords: Record<string, EmbalmForm>;
  clearedCases: string[];
  log: LogEntry[];
};

const INITIAL: FlowState = {
  screen: "home",
  manual: "",
  scanError: "",
  scanned: "",
  trip: null,
  tag: null,
  photoUrl: "",
  otp: "",
  otpSentAt: 0,
  otpFail: "",
  pipeline: "",
  stepKey: "",
  taskIdx: 0,
  casketTag: "",
  casketPlaced: "Yes",
  departedAt: "",
  em: emptyEmbalmForm(""),
  progress: {},
  embalmRecords: {},
  clearedCases: [],
  log: [],
};

const SCAN_SCREENS: Screen[] = [
  "scanLookup",
  "scanTrip",
  "scanTag",
  "scanProcess",
  "scanAttach",
  "checkTrip",
  "checkTag",
  "scanCasket",
];

/** Screens that belong to a service run rather than the standalone check. */
const PIPE_SCREENS: Screen[] = [
  "processPick",
  "checkTrip",
  "checkTag",
  "scanAttach",
  "scanCasket",
  "casket",
  "photo",
  "review",
  "authorize",
  "otp",
  "final",
  "depart",
  "arrive",
  "embalm",
];

const MATCH_FLOW: Screen[] = ["scanTrip", "tripDetails", "scanTag", "result"];
const LOOKUP_FLOW: Screen[] = ["scanLookup", "casketDetails"];
const PROCESS_FLOW: Screen[] = [
  "scanProcess",
  "processPick",
  "photo",
  "review",
  "authorize",
  "otp",
  "final",
];

const LOG_LIMIT = 6;
const TOAST_MS = 3200;

function stamp(): string {
  return new Date().toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Wrapped so the clock is read outside the component's render path. */
function nowMs(): number {
  return Date.now();
}

/**
 * The Personnel Scan flow: QR matching as a standalone check, and the full
 * retrieval or embalming run where every step ends in a family authorization.
 *
 * All of it is one component because the screens are not independent — the
 * footer, the header and the progress bar are all derived from the same step
 * cursor, and splitting the state would mean threading it back together.
 */
export default function PersonnelScan() {
  const [state, setState] = useState<FlowState>(INITIAL);
  const [notice, setNotice] = useState("");
  // Bumped on every flash so repeating the same message restarts the timer.
  const [noticeSeq, setNoticeSeq] = useState(0);
  const [now, setNow] = useState(nowMs);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  // Object URLs are released together on unmount: revoking one as it is
  // replaced breaks the preview under StrictMode's double-invoked effects.
  const photoUrls = useRef<string[]>([]);

  useEffect(
    () => () => {
      photoUrls.current.forEach((url) => URL.revokeObjectURL(url));
      photoUrls.current = [];
    },
    [],
  );

  // Any tap on the page counts as the gesture that lets audio play, so the
  // camera's first read can beep even though it happens without one.
  useEffect(() => {
    document.addEventListener("pointerdown", unlockScanSound);
    return () => document.removeEventListener("pointerdown", unlockScanSound);
  }, []);

  // Every scan is heard: a new accepted code or a new rejection. Keyed on the
  // values, so a camera re-reading the same rejected code does not repeat it.
  useEffect(() => {
    if (state.scanned) playScanFeedback("ok");
  }, [state.scanned]);

  useEffect(() => {
    if (state.scanError) playScanFeedback("error");
  }, [state.scanError]);

  // The OTP screen is the only one that shows a running clock.
  useEffect(() => {
    if (state.screen !== "otp") return;
    const id = setInterval(() => setNow(nowMs()), 1000);
    return () => clearInterval(id);
  }, [state.screen]);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(""), TOAST_MS);
    return () => clearTimeout(id);
  }, [notice, noticeSeq]);

  const flash = (message: string) => {
    setNotice(message);
    setNoticeSeq((seq) => seq + 1);
  };

  const addLog = (text: string, tone: LogEntry["tone"]) =>
    setState((s) => ({
      ...s,
      log: [{ text, tone, at: stamp() }, ...s.log].slice(0, LOG_LIMIT),
    }));

  /** Every navigation clears the scan scratchpad, so no screen inherits one. */
  const go = (screen: Screen, extra: Partial<FlowState> = {}) =>
    setState((s) => ({
      ...s,
      screen,
      scanned: "",
      scanError: "",
      manual: "",
      ...extra,
    }));

  // ---------------------------------------------------------------- derived

  const trip = state.trip;
  const tag = state.tag;
  const matched = !!(trip && tag && trip.caseId === tag.caseId);

  const pipeKey = trip ? `${state.pipeline}:${trip.caseId}` : "";
  const doneAt = state.progress[pipeKey] ?? {};
  const pipe: (PipelineStep & { at: string })[] = (
    state.pipeline ? PIPELINES[state.pipeline] : []
  ).map((step) => ({ ...step, at: doneAt[step.key] ?? "" }));

  const nextStep = pipe.find((step) => !step.at) ?? null;
  const curStep = pipe.find((step) => step.key === state.stepKey) ?? nextStep;

  const inPipe = PIPE_SCREENS.includes(state.screen) && !!state.pipeline;
  const inMatchFlow = MATCH_FLOW.includes(state.screen);
  const inLookupFlow = LOOKUP_FLOW.includes(state.screen);
  const steps = inMatchFlow
    ? MATCH_FLOW
    : inLookupFlow
      ? LOOKUP_FLOW
      : PROCESS_FLOW;
  const idx = steps.indexOf(state.screen);
  const showProgress =
    inMatchFlow || inLookupFlow || PROCESS_FLOW.includes(state.screen) || inPipe;
  const inFlow = state.screen !== "home";

  const pipelineLabel =
    state.pipeline === "embalm"
      ? "Embalming"
      : state.pipeline === "viewing"
        ? "Outside viewing trip"
        : "Retrieval trip";
  const viewing = state.pipeline === "viewing";
  // Where the current trip ends: the chapel for a retrieval, the wake venue
  // for a viewing.
  const tripTo = viewing
    ? (trip?.destination ?? "Viewing venue")
    : DESTINATION_CHAPEL;
  const tripToShort = viewing ? "viewing venue" : "chapel";
  const stepLabel = curStep?.label ?? "";

  const remaining = state.otpSentAt
    ? Math.max(0, OTP_TTL_MS - (now - state.otpSentAt))
    : 0;
  const otpExpired = state.otpSentAt > 0 && remaining === 0;

  const embalmReady = !!(
    state.em.embalmer &&
    state.em.start &&
    state.em.end &&
    state.em.types.length
  );

  // -------------------------------------------------------------- scanning

  const handleCode = (raw: string, fromCamera = false) =>
    setState((s) => {
      // Frames already in flight when a code was accepted must not replace it
      // before the camera stops.
      if (fromCamera && s.scanned) return s;
      const code = String(raw ?? "")
        .trim()
        .toUpperCase();
      const doc = lookupDoc(code);
      const reject = (message: string): FlowState => ({
        ...s,
        scanError: message,
        scanned: "",
      });
      const accept = (extra: Partial<FlowState> = {}): FlowState => ({
        ...s,
        scanned: code,
        scanError: "",
        manual: "",
        ...extra,
      });

      switch (s.screen) {
        case "scanLookup":
          if (!doc || doc.kind !== "ck")
            return reject("Scan the barcode on the casket tag (CK-…).");
          return accept({ trip: doc, tag: null, pipeline: "" });

        case "scanTrip":
          if (!doc) return reject(`${code || "That code"} is not a QR on file.`);
          return accept({ trip: doc });

        case "scanTag":
          if (!doc) return reject(`${code || "That code"} is not a QR on file.`);
          if (s.trip && doc.code === s.trip.code)
            return reject("That is the same QR. Scan a different document.");
          return accept({ tag: doc });

        case "checkTrip": {
          const wantEmbalm = s.pipeline === "embalm";
          if (!doc || doc.kind !== (wantEmbalm ? "embalm" : "trip"))
            return reject(
              wantEmbalm
                ? "Scan the embalming ticket QR (ET-…)."
                : "Scan the trip ticket QR (TT-…).",
            );
          if (!s.trip || doc.caseId !== s.trip.caseId)
            return reject(
              `${doc.code} is for ${doc.deceased}, not ${s.trip?.deceased}.`,
            );
          return accept();
        }

        case "checkTag": {
          if (!doc || doc.kind !== "tag")
            return reject("Scan the toe tag QR (TAG-…).");
          if (!s.trip || doc.caseId !== s.trip.caseId) {
            // A mismatch here is the whole point of the check, so it goes on
            // the log even though the operator never left the screen.
            const where =
              s.pipeline === "embalm" ? "before embalming" : "at departure";
            const entry: LogEntry = {
              text: `Mismatch ${where} · ${doc.code} ≠ ${s.trip?.caseId}`,
              tone: "bad",
              at: stamp(),
            };
            return {
              ...reject(
                `MISMATCH — ${doc.code} is for ${doc.deceased}. ${
                  s.pipeline === "embalm"
                    ? "Do not proceed with embalming"
                    : "Do not leave the chapel"
                }; notify your supervisor.`,
              ),
              log: [entry, ...s.log].slice(0, LOG_LIMIT),
            };
          }
          return accept({ tag: doc });
        }

        case "scanCasket":
          if (!doc || doc.kind !== "ck")
            return reject("Scan the barcode on the casket tag (CK-…).");
          if (!s.trip || doc.caseId !== s.trip.caseId) {
            if (s.pipeline !== "viewing")
              return reject(
                `${doc.code} is assigned to ${doc.deceased}. Wrong casket.`,
              );
            // Leaving with the wrong casket is the failure this trip's check
            // exists for, so it is logged like a toe-tag mismatch.
            const entry: LogEntry = {
              text: `Casket mismatch before viewing trip · ${doc.code} ≠ ${s.trip?.code}`,
              tone: "bad",
              at: stamp(),
            };
            return {
              ...reject(
                `MISMATCH — ${doc.code} is for ${doc.deceased}, but trip ticket ${s.trip?.code} is for ${s.trip?.deceased}. Check that the deceased in the casket matches the trip ticket. Do not leave the chapel; notify your supervisor.`,
              ),
              log: [entry, ...s.log].slice(0, LOG_LIMIT),
            };
          }
          return accept({ casketTag: doc.code });

        case "scanAttach":
          if (!doc || doc.kind !== "tag")
            return reject("Scan the toe tag QR (TAG-…).");
          if (!s.trip || doc.caseId !== s.trip.caseId)
            return reject(
              `${doc.code} belongs to ${doc.deceased}, not ${s.trip?.deceased}. Do not attach.`,
            );
          return accept({ tag: doc });

        case "scanProcess": {
          // Either QR works at the site — the ticket or the toe tag.
          const tripCode = doc ? findTripCode(doc.caseId) : undefined;
          if (!doc || !tripCode)
            return reject(
              `${code || "That code"} is not a trip ticket or toe tag on file.`,
            );
          const isEmbalming = doc.kind === "embalm";
          // A viewing ticket is its own trip; any other document of the
          // service resolves to its retrieval ticket.
          const isViewing = doc.kind === "trip" && doc.tripType === "viewing";
          const service = lookupDoc(
            isEmbalming || isViewing ? doc.code : tripCode,
          );
          if (!service)
            return reject(
              `${code} is not a trip ticket or toe tag on file.`,
            );
          return accept({
            trip: service,
            tag: null,
            casketTag: "",
            pipeline: isEmbalming ? "embalm" : isViewing ? "viewing" : "retrieval",
          });
        }

        default:
          return s;
      }
    });

  // The camera only runs while the viewfinder is up. Once a code is accepted
  // the record takes its place, and "Scan another QR" brings it back.
  const { camera, retry: retryCamera } = useCodeScanner({
    videoRef,
    active: SCAN_SCREENS.includes(state.screen) && !state.scanned,
    onCode: (raw) => handleCode(raw, true),
  });

  const rescan = () =>
    setState((s) => ({ ...s, scanned: "", scanError: "", manual: "" }));

  // ----------------------------------------------------------- step cursor

  const markStepDone = (key: string) =>
    setState((s) => {
      const k = s.trip ? `${s.pipeline}:${s.trip.caseId}` : "";
      return {
        ...s,
        progress: {
          ...s.progress,
          [k]: { ...(s.progress[k] ?? {}), [key]: stamp() },
        },
        screen: "processPick",
        scanned: "",
        scanError: "",
        manual: "",
      };
    });

  const openTask = (screen: TaskScreen, extra: Partial<FlowState> = {}) => {
    switch (screen) {
      case "embalm": {
        if (!trip) return;
        const saved = state.embalmRecords[trip.caseId];
        go("embalm", {
          // Each service loads its own record, never the last one typed.
          em: saved ? { ...saved } : emptyEmbalmForm(embalmerFor(trip.caseId)),
          ...extra,
        });
        return;
      }
      case "scanAttach":
        go("scanAttach", { tag: null, ...extra });
        return;
      case "photo":
        go("photo", { photoUrl: "", ...extra });
        return;
      case "scanCasket":
        go("scanCasket", { casketTag: "", ...extra });
        return;
      case "casket":
        go("casket", { casketPlaced: "Yes", ...extra });
        return;
      default:
        go(screen, extra);
    }
  };

  const startStep = (step: PipelineStep) =>
    openTask(step.tasks[0], { stepKey: step.key, taskIdx: 0 });

  /** Advances within the current step, then closes it — with or without OTP. */
  const completeTask = () => {
    const next = state.taskIdx + 1;
    if (curStep && next < curStep.tasks.length) {
      openTask(curStep.tasks[next], { taskIdx: next });
      return;
    }
    if (curStep && curStep.otp === false) {
      markStepDone(curStep.key);
      return;
    }
    go("authorize", { otp: "", otpSentAt: 0, otpFail: "" });
  };

  // -------------------------------------------------------------- handlers

  const back = () => {
    if (state.screen === "home") return;
    if (inPipe && state.screen !== "processPick") return go("processPick");
    if (state.screen === "processPick") return go("home");
    if (state.screen === "final" || state.screen === "result" || idx <= 0)
      return go("home");
    go(steps[idx - 1]);
  };

  useFlowHistory(inFlow, back);

  const checkMatch = () => {
    if (!trip || !tag) return;
    const ok = trip.caseId === tag.caseId;
    const keys = [`${trip.kind}:${trip.caseId}`, `${tag.kind}:${trip.caseId}`];
    addLog(
      ok
        ? `Matched ${trip.code} ↔ ${tag.code}`
        : `Mismatch ${trip.code} ↔ ${tag.code}`,
      ok ? "good" : "bad",
    );
    setState((s) => ({
      ...s,
      screen: "result",
      scanned: "",
      scanError: "",
      manual: "",
      clearedCases: ok
        ? Array.from(new Set([...s.clearedCases, ...keys]))
        : s.clearedCases,
    }));
  };

  const sendOtp = () => {
    if (!trip) return;
    const sentAt = nowMs();
    setNow(sentAt);
    go("otp", { otp: "", otpSentAt: sentAt, otpFail: "" });
    flash(`OTP sent to ${trip.contact}`);
  };

  const verifyOtp = () => {
    if (!trip || state.otp.length < 6) return;
    if (otpExpired) {
      addLog(`OTP expired · ${trip.caseId}`, "bad");
      go("final", { otpFail: "expired" });
      return;
    }
    if (state.otp !== DEMO_OTP) {
      addLog(`Invalid OTP · ${trip.caseId}`, "bad");
      go("final", { otpFail: "invalid" });
      return;
    }
    addLog(`Family authorized · ${stepLabel} · ${trip.deceased}`, "good");
    go("final", { otpFail: "" });
  };

  const pickPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Clearing the value lets the same file be picked twice in a row.
    event.target.value = "";
    if (!file) return;
    const url = URL.createObjectURL(file);
    photoUrls.current.push(url);
    setState((s) => ({ ...s, photoUrl: url }));
  };

  const saveEmbalming = () => {
    if (!trip) return;
    if (state.em.end <= state.em.start) {
      flash("End time must be after the start time.");
      return;
    }
    setState((s) => ({
      ...s,
      embalmRecords: { ...s.embalmRecords, [trip.caseId]: { ...s.em } },
    }));
    addLog(`Embalming summary saved · ${trip.deceased}`, "good");
    completeTask();
  };

  const confirmCasketing = () => {
    const doc = lookupDoc(state.casketTag);
    if (!doc || doc.kind !== "ck") {
      flash("Enter a valid casket tag (CK-…).");
      return;
    }
    if (!trip || doc.caseId !== trip.caseId) {
      flash(`${doc.code} is assigned to another service.`);
      return;
    }
    addLog(`Casketed · ${doc.code} · ${trip.deceased}`, "good");
    completeTask();
  };

  // ------------------------------------------------------------ scan copy

  const scanKind: ScanKind =
    state.screen === "scanLookup"
      ? "lookup"
      : state.screen === "scanCasket"
      ? "casket"
      : state.screen === "checkTrip"
        ? "checkTrip"
        : state.screen === "checkTag"
          ? "checkTag"
          : state.screen === "scanAttach"
            ? "attach"
            : state.screen === "scanTag"
              ? "tag"
              : state.screen === "scanProcess"
                ? "process"
                : "trip";

  const who = trip?.deceased ?? "this service";
  const scanHint =
    scanKind === "lookup"
      ? "Scan the barcode on any casket tag to see who is in the casket and which room they are in."
      : scanKind === "casket"
      ? viewing
        ? `Before leaving the chapel, scan the casket barcode. It must be ${who}'s casket to match trip ticket ${trip?.code ?? ""}.`
        : `Scan the barcode on the casket tag for ${who} · ${trip?.casket ?? ""}`
      : scanKind === "checkTrip"
        ? state.pipeline === "embalm"
          ? `Before embalming, scan the embalming ticket for ${who}.`
          : `Before leaving the chapel, scan the trip ticket for ${who}.`
        : scanKind === "checkTag"
          ? `Scan the toe tag to match with ${trip?.code ?? "the trip ticket"}.`
          : scanKind === "attach"
            ? `${
                state.pipeline === "embalm"
                  ? `Scan the toe tag on ${trip?.deceased ?? "the deceased"}`
                  : `Scan the toe tag prepared for ${trip?.deceased ?? "the deceased"}`
              } to link it to ${trip?.caseId ?? "this service"}.`
            : scanKind === "process"
              ? "Scan any QR of the service. The system shows the next step to authorize."
              : scanKind === "tag"
                ? `Scan a second QR to compare with ${
                    trip ? `${trip.docType} ${trip.code}` : "the first"
                  }.`
                : "Scan any service QR — trip ticket, embalming ticket, toe tag, wristband or casket tag.";

  // ---------------------------------------------------------------- titles

  const titles: Record<Screen, [string, string]> = {
    home: ["Scan QR Facility", "Service Verification"],
    scanLookup: ["Scan Casket Barcode", "Casket Lookup"],
    casketDetails: [trip?.deceased ?? "Casket Details", trip?.room ?? "Casket Lookup"],
    scanTrip: ["Scan First QR", "Any service document"],
    tripDetails: [trip ? `${trip.docType} Details` : "Details", "QR Matching"],
    scanTag: [
      "Scan Second QR",
      trip ? `Compare with ${trip.code}` : "QR Matching",
    ],
    result: [matched ? "Match Confirmation" : "Mismatch", "QR Matching"],
    scanProcess: ["Scan QR to Process", "Retrieval, viewing or embalming"],
    processPick: ["Service Process", pipelineLabel],
    scanAttach: [
      state.pipeline === "embalm" ? "Toe Tag Verification" : "Scan Toe Tag",
      trip?.deceased ?? "",
    ],
    casket: ["Casketing", trip?.deceased ?? ""],
    scanCasket: [
      "Scan Casket Barcode",
      viewing ? "Casket matching · before the trip" : (trip?.deceased ?? ""),
    ],
    checkTrip: [
      state.pipeline === "embalm" ? "Scan Embalming Ticket" : "Scan Trip Ticket",
      state.pipeline === "embalm"
        ? "Matching · preparation room"
        : "Departure check · at the chapel",
    ],
    checkTag: [
      "Scan Toe Tag",
      state.pipeline === "embalm"
        ? "Matching · preparation room"
        : "Departure check · at the chapel",
    ],
    depart: [
      viewing ? "Depart to Viewing Venue" : "Depart to Chapel",
      pipelineLabel,
    ],
    arrive: [
      viewing ? "Arrive at Viewing Venue" : "Arrive at Chapel",
      pipelineLabel,
    ],
    embalm: ["Embalming Summary", "Preparation room"],
    photo: ["Add Deceased Photo", stepLabel],
    review: ["Review Details", stepLabel],
    authorize: ["Family Authorization", stepLabel],
    otp: ["Enter OTP", stepLabel],
    final: [state.otpFail ? "Authorization Failed" : "Authorized", stepLabel],
  };

  // ---------------------------------------------------------------- footer

  let footer: { primary: FooterAction; secondary?: FooterAction } | null = null;

  switch (state.screen) {
    case "scanLookup":
      footer = {
        primary: {
          label: "View details",
          enabled: !!state.scanned,
          onClick: () => go("casketDetails"),
        },
      };
      break;
    case "casketDetails":
      footer = {
        primary: {
          label: "Scan another casket",
          onClick: () => go("scanLookup", { trip: null }),
        },
        secondary: {
          label: "Done",
          onClick: () => go("home", { trip: null }),
        },
      };
      break;
    case "scanTrip":
      footer = {
        primary: {
          label: "Continue",
          enabled: !!state.scanned,
          onClick: () => go("tripDetails"),
        },
      };
      break;
    case "tripDetails":
      footer = {
        primary: {
          label: "Next: Scan Second QR",
          onClick: () => go("scanTag", { tag: null }),
        },
      };
      break;
    case "scanTag":
      footer = {
        primary: {
          label: "Check match",
          enabled: !!state.scanned,
          onClick: checkMatch,
        },
      };
      break;
    case "result":
      footer = matched
        ? {
            primary: {
              label: "Proceed",
              onClick: () => {
                go("home");
                flash(
                  `${trip?.docType} and ${tag?.docType} matched for ${trip?.deceased}.`,
                );
              },
            },
          }
        : {
            primary: {
              label: "Stop & Notify Supervisor",
              tone: "danger",
              onClick: () => {
                addLog(`Supervisor notified · ${trip?.code}`, "bad");
                go("home", { tag: null });
                flash("Supervisor notified. Hold the process until resolved.");
              },
            },
            secondary: {
              label: "Rescan second QR",
              onClick: () => go("scanTag", { tag: null }),
            },
          };
      break;
    case "scanProcess":
      footer = {
        primary: {
          label: "Continue",
          enabled: !!state.scanned,
          onClick: () => go("processPick"),
        },
      };
      break;
    case "processPick":
      footer = nextStep
        ? {
            primary: {
              label: `Start: ${nextStep.label}`,
              onClick: () => startStep(nextStep),
            },
          }
        : {
            primary: {
              label: "Back to menu",
              onClick: () => {
                addLog(
                  `${pipelineLabel} complete · ${trip?.deceased}`,
                  "good",
                );
                go("home", {
                  trip: null,
                  tag: null,
                  photoUrl: "",
                  otp: "",
                  otpSentAt: 0,
                  pipeline: "",
                });
              },
            },
          };
      break;
    case "checkTrip":
      footer = {
        primary: {
          label: "Next: Scan Toe Tag",
          enabled: !!state.scanned,
          onClick: completeTask,
        },
      };
      break;
    case "checkTag":
      footer = {
        primary: {
          label: "Confirm match",
          enabled: !!state.scanned,
          onClick: () => {
            if (!trip || !tag) return;
            addLog(
              `Matched ${trip.code} ↔ ${tag.code} · ${
                state.pipeline === "embalm"
                  ? "cleared for embalming"
                  : "cleared to leave chapel"
              }`,
              "good",
            );
            completeTask();
          },
        },
      };
      break;
    case "scanAttach":
      footer = {
        primary: {
          label: "Confirm toe tag",
          enabled: !!state.scanned,
          onClick: () => {
            if (!trip || !tag) return;
            addLog(
              `Toe tag ${tag.code} ${
                state.pipeline === "embalm" ? "verified" : "scanned"
              } · ${trip.deceased}`,
              "good",
            );
            completeTask();
          },
        },
      };
      break;
    case "scanCasket":
      footer = {
        primary: {
          label: viewing ? "Confirm match · proceed to trip" : "Next",
          enabled: !!state.scanned,
          onClick: () => {
            if (viewing && trip)
              addLog(
                `Matched ${trip.code} ↔ ${state.casketTag} · cleared for viewing trip`,
                "good",
              );
            completeTask();
          },
        },
      };
      break;
    case "casket":
      footer = {
        primary: {
          label: "Confirm casketing",
          enabled: !!state.casketTag,
          onClick: confirmCasketing,
        },
      };
      break;
    case "embalm":
      footer = {
        primary: {
          label: "Save embalming summary",
          enabled: embalmReady,
          onClick: saveEmbalming,
        },
      };
      break;
    case "depart":
      footer = {
        primary: {
          label: "Confirm departure",
          onClick: () => {
            if (!trip) return;
            addLog(`Departed to ${tripToShort} · ${trip.deceased}`, "good");
            setState((s) => ({ ...s, departedAt: stamp() }));
            completeTask();
          },
        },
      };
      break;
    case "arrive":
      footer = {
        primary: {
          label: `Confirm arrival at ${tripToShort}`,
          onClick: () => {
            if (!trip) return;
            addLog(`Arrived at ${tripToShort} · ${trip.deceased}`, "good");
            completeTask();
          },
        },
      };
      break;
    case "photo":
      footer = {
        primary: {
          label: "Next",
          enabled: !!state.photoUrl,
          onClick: completeTask,
        },
      };
      break;
    case "review":
      footer = { primary: { label: "Confirm details", onClick: completeTask } };
      break;
    case "authorize":
      footer = {
        primary: { label: "Send OTP to family", onClick: sendOtp },
      };
      break;
    case "otp":
      footer = {
        primary: {
          label: "Verify",
          enabled: state.otp.length === 6,
          onClick: verifyOtp,
        },
      };
      break;
    case "final":
      footer = state.otpFail
        ? {
            primary: { label: "Resend OTP", onClick: sendOtp },
            secondary: {
              label: "Back",
              onClick: () => go("authorize", { otp: "", otpFail: "" }),
            },
          }
        : {
            primary: {
              label: "Proceed",
              onClick: () => curStep && markStepDone(curStep.key),
            },
          };
      break;
    default:
      footer = null;
  }

  // ---------------------------------------------------------------- render

  const isScanScreen = SCAN_SCREENS.includes(state.screen);

  return (
    // The kit page owns the header. Its back button calls history.back(),
    // which useFlowHistory turns into a step back through the flow.
    <Page.Root
      title={titles[state.screen][0]}
      description={titles[state.screen][1]}
      headerButton={inFlow ? "back" : "menu"}>
      <Page.MainContent maxW="440px">
        {showProgress && (
          <Page.Row>
            <FlowProgress
              steps={
                inPipe
                  ? pipe.map((step) => !!step.at)
                  : steps.map((_, index) => index <= idx)
              }
            />
          </Page.Row>
        )}

        <Page.Row pb="24px">
          <Flex direction="column" gap="14px">
            {state.screen === "home" && (
              <HomeScreen
                matchedServices={
                  new Set(state.clearedCases.map((key) => key.split(":")[1])).size
                }
                hasEmbalmed={Object.keys(state.embalmRecords).length > 0}
                log={state.log}
                onOpenMatching={() =>
                  go("scanTrip", { trip: null, tag: null, pipeline: "" })
                }
                onOpenProcess={() => go("scanProcess", { trip: null, tag: null })}
                onOpenLookup={() =>
                  go("scanLookup", { trip: null, tag: null, pipeline: "" })
                }
              />
            )}

            {isScanScreen && (
              <ScanScreen
                hint={scanHint}
                videoRef={videoRef}
                camera={camera}
                onRetryCamera={retryCamera}
                onRescan={rescan}
                scannedCode={state.scanned}
                scannedLabel={lookupDoc(state.scanned)?.docType ?? "QR"}
                error={state.scanError}
                manual={state.manual}
                placeholder="e.g. WB-2026-000123"
                samples={sampleCodes(scanKind, state.pipeline)}
                onManualChange={(value) =>
                  setState((s) => ({ ...s, manual: value }))
                }
                onSubmitManual={() => handleCode(state.manual)}
                onUseSample={(code) => handleCode(code)}
              />
            )}

            {state.screen === "tripDetails" && trip && <DetailsScreen doc={trip} />}

            {state.screen === "casketDetails" && trip && (
              <CasketDetailsScreen doc={trip} />
            )}

            {state.screen === "result" && trip && tag && (
              <ResultScreen first={trip} second={tag} matched={matched} />
            )}

            {state.screen === "processPick" && trip && (
              <ProcessScreen
                pipelineLabel={pipelineLabel}
                deceased={trip.deceased ?? ""}
                meta={`${trip.caseId} · ${trip.code}${tag ? ` · ${tag.code}` : ""}`}
                steps={pipe}
                nextKey={nextStep?.key ?? null}
              />
            )}

            {(state.screen === "depart" || state.screen === "arrive") && trip && (
              <MoveScreen
                arriving={state.screen === "arrive"}
                fromLabel={viewing ? "the chapel" : "the retrieval site"}
                toLabel={viewing ? "the viewing venue" : "the chapel"}
                from={trip.pickup ?? "Retrieval site"}
                to={tripTo}
                rows={[
                  ["Deceased", trip.deceased ?? "—"],
                  viewing
                    ? ["Casket tag", state.casketTag || "—"]
                    : ["Toe tag", tag?.code ?? findTagCode(trip.caseId) ?? "—"],
                  ["Vehicle", trip.vehicle ?? "—"],
                  ["Driver", trip.driver ?? "—"],
                  ["Departed", state.departedAt || "—"],
                ]}
              />
            )}

            {state.screen === "embalm" && trip && (
              <EmbalmScreen
                name={trip.deceased ?? ""}
                meta={`${trip.caseId} · DOD ${trip.dod ?? "—"}`}
                value={state.em}
                onChange={(em) => setState((s) => ({ ...s, em }))}
              />
            )}

            {state.screen === "casket" && trip && (
              <CasketScreen
                model={trip.casket ?? "Per contract"}
                casketTag={state.casketTag}
                placed={state.casketPlaced}
                onPlacedChange={(placed) =>
                  setState((s) => ({ ...s, casketPlaced: placed }))
                }
              />
            )}

            {state.screen === "photo" && (
              <PhotoScreen
                showSample={state.pipeline !== "embalm"}
                photoUrl={state.photoUrl}
                onPick={pickPhoto}
                hint={
                  state.pipeline === "embalm"
                    ? "Embalmer: take a photo of the deceased after embalming and casketing, before family authorization."
                    : "Driver: hold the toe tag in front of the camera with the deceased in the background. The tag is attached after family authorization."
                }
                rule={
                  state.pipeline === "embalm"
                    ? `Face, casket and the toe tag QR${tag ? ` (${tag.code})` : ""} must be visible in the photo.`
                    : `Toe tag QR${tag ? ` (${tag.code})` : ""} in focus in front, deceased's face visible behind it.`
                }
              />
            )}

            {state.screen === "review" && trip && (
              <ReviewScreen
                photoUrl={state.photoUrl}
                rows={[
                  ["Name", trip.deceased ?? "—"],
                  ["Date of birth · age", trip.dob ?? "—"],
                  ["Date of death", trip.dod ?? "—"],
                  ["Service ID", trip.caseId],
                  ["Toe tag", tag?.code ?? "—"],
                ]}
                tagLinked={!!tag}
                tagLabel={
                  tag
                    ? `Toe tag ${tag.code} linked`
                    : "Toe tag is attached after family authorization"
                }
              />
            )}

            {state.screen === "authorize" && trip && (
              <AuthorizeScreen
                stepLabel={stepLabel || "Family authorization"}
                contactName={trip.contact ?? "—"}
                contactMasked={trip.phone ?? "—"}
              />
            )}

            {state.screen === "otp" && trip && (
              <OtpScreen
                sentTo={`Code sent to ${trip.contact} · ${trip.phone}`}
                otp={state.otp}
                onOtpChange={(value) =>
                  setState((s) => ({
                    ...s,
                    otp: value.replace(/\D/g, "").slice(0, 6),
                  }))
                }
                expired={otpExpired}
                timerLabel={
                  otpExpired
                    ? "Code expired — resend a new one"
                    : `Valid for ${Math.floor(remaining / 60000)}:${String(
                        Math.floor(remaining / 1000) % 60,
                      ).padStart(2, "0")}`
                }
                onResend={sendOtp}
              />
            )}

            {state.screen === "final" && (
              <Outcome
                ok={!state.otpFail}
                title={
                  state.otpFail ? "Authorization failed" : "Family authorized"
                }>
                {state.otpFail === "expired"
                  ? "The code expired. Request a new OTP for the family."
                  : state.otpFail
                    ? "Invalid code. Ask the family to check the message, or request a new OTP."
                    : trip
                      ? `${stepLabel || "This step"} approved by ${trip.contact}. ${
                          curStep?.key === "tagging"
                            ? "Attach the toe tag to the deceased and proceed with the retrieval."
                            : "You may proceed."
                        }`
                      : ""}
              </Outcome>
            )}
          </Flex>
        </Page.Row>

        {/* Not wrapped in a Page.Row: the footer is sticky, and a wrapper of
            its own height would give it nowhere to stick. */}
        {footer && (
          <FlowFooter primary={footer.primary} secondary={footer.secondary} />
        )}

        {/* Page.Root only renders its ToolContent and MainContent children. */}
        {notice && <Toast message={notice} />}
      </Page.MainContent>
    </Page.Root>
  );
}
