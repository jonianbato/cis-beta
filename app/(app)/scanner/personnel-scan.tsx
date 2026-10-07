"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Flex } from "@chakra-ui/react";
import { Page } from "osp-ui-kit";
import { useCodeScanner } from "@/lib/use-code-scanner";
import { playScanFeedback, unlockScanSound } from "@/lib/scan-feedback";
import {
  DEMO_OTP,
  DESTINATION_CHAPEL,
  CONTRACTING_PARTY,
  OTP_TTL_MS,
  PIPELINES,
  RECEIVERS,
  RECEIVER_ROLES,
  embalmerFor,
  embalmRequestFor,
  findCasketCode,
  findEmbalmCode,
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
  AppWaitScreen,
  AuthorizeScreen,
  EndorseScreen,
  MoveScreen,
  OtpScreen,
  ProcessScreen,
} from "./screen-steps";
import { PhotoScreen, PhotoViewer } from "./screen-capture";
import {
  EmbalmRequestScreen,
  EmbalmScreen,
  emptyEmbalmForm,
  deviationsExplained,
  type EmbalmForm,
} from "./screen-embalm";

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
  | "checkTag"
  | "endorse"
  | "receiveTag"
  | "scanCasket"
  | "photo"
  | "authorize"
  | "appWait"
  | "otp"
  | "final"
  | "depart"
  | "arrive"
  | "embalmRequest"
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
  /** How the family approved the step: a code read back, or in their app. */
  authVia: "otp" | "app";
  pipeline: Pipeline | "";
  /** Which step of the pipeline is open, and how far into its task list. */
  stepKey: string;
  taskIdx: number;
  casketTag: string;
  departedAt: string;
  /** Who at the chapel the deceased is endorsed to for embalming. */
  receiverRole: string;
  receiverName: string;
  em: EmbalmForm;
  /** `pipeline:caseId` -> step key -> the time that step was authorized. */
  progress: Record<string, Record<string, string>>;
  embalmRecords: Record<string, EmbalmForm>;
  /**
   * caseId -> when the procedure was started and finished, as "HH:MM" for the
   * summary's time fields and as a stamp for the status line.
   */
  embalmTimes: Record<
    string,
    { start: string; startedAt: string; end?: string; endedAt?: string }
  >;
  /** caseId -> the photo of the deceased required before embalming starts. */
  preEmbalmPhotos: Record<string, string>;
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
  authVia: "otp",
  pipeline: "",
  stepKey: "",
  taskIdx: 0,
  casketTag: "",
  departedAt: "",
  receiverRole: RECEIVER_ROLES[0],
  receiverName: "",
  em: emptyEmbalmForm("", embalmRequestFor("")),
  progress: {},
  embalmRecords: {},
  embalmTimes: {},
  preEmbalmPhotos: {},
  clearedCases: [],
  log: [],
};

const SCAN_SCREENS: Screen[] = [
  "scanLookup",
  "scanTrip",
  "scanTag",
  "scanProcess",
  "checkTag",
  "receiveTag",
  "scanCasket",
];

/** Screens that belong to a service run rather than the standalone check. */
const PIPE_SCREENS: Screen[] = [
  "processPick",
  "checkTag",
  "endorse",
  "receiveTag",
  "scanCasket",
  "photo",
  "authorize",
  "appWait",
  "otp",
  "final",
  "depart",
  "arrive",
  "embalmRequest",
  "embalm",
];

const MATCH_FLOW: Screen[] = ["scanTrip", "tripDetails", "scanTag", "result"];
const LOOKUP_FLOW: Screen[] = ["scanLookup", "casketDetails"];
const PROCESS_FLOW: Screen[] = [
  "scanProcess",
  "processPick",
  "photo",
  "authorize",
  "otp",
  "final",
];

const LOG_LIMIT = 6;
/** The demo family takes this long to approve in their app. */
const APP_APPROVE_MS = [3000, 5000] as const;
const TOAST_MS = 3200;

function stamp(): string {
  return new Date().toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** The time now as a time field holds it, "HH:MM" in 24 hours. */
function clock(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes(),
  ).padStart(2, "0")}`;
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
  // Back from the viewing venue, the last leg ends at the chapel again.
  const returningToChapel = curStep?.key === "returnArrive";
  const tripTo =
    viewing && !returningToChapel
      ? (trip?.destination ?? "Viewing venue")
      : DESTINATION_CHAPEL;
  const tripToShort = viewing && !returningToChapel ? "viewing venue" : "chapel";
  const stepLabel = curStep?.label ?? "";
  // The photo that confirms receiving at the chapel is the receiver's, not the
  // driver's toe-tagging photo.
  const receiving = curStep?.key === "receive";
  // The CM/FCR's own check of an encasketed deceased, made the same way.
  const confirmingReady = curStep?.key === "readyConfirm";

  const remaining = state.otpSentAt
    ? Math.max(0, OTP_TTL_MS - (now - state.otpSentAt))
    : 0;
  const otpExpired = state.otpSentAt > 0 && remaining === 0;

  const embalmRequest = embalmRequestFor(trip?.caseId ?? "");
  const procedure = trip ? state.embalmTimes[trip.caseId] : undefined;
  const preEmbalmPhoto = trip ? (state.preEmbalmPhotos[trip.caseId] ?? "") : "";
  // The casket on the contract, and the room it lies in state in.
  const casketDoc = trip ? lookupDoc(findCasketCode(trip.caseId) ?? "") : null;
  const embalmReady = !!(
    state.em.embalmer &&
    state.em.start &&
    state.em.end &&
    deviationsExplained(state.em, embalmRequest)
  );

  // Authorize via app: the family's phone is notified, and for the demo they
  // approve after a few seconds. Leaving the screen withdraws the request.
  const waitingFor = state.screen === "appWait" ? stepLabel : "";
  const waitingName = trip?.deceased ?? "";
  useEffect(() => {
    if (!waitingFor) return;
    const [min, max] = APP_APPROVE_MS;
    const id = setTimeout(
      () =>
        setState((s) =>
          s.screen !== "appWait"
            ? s
            : {
                ...s,
                screen: "final",
                otpFail: "",
                authVia: "app",
                log: [
                  {
                    text: `Family authorized in app · ${waitingFor} · ${waitingName}`,
                    tone: "good" as const,
                    at: stamp(),
                  },
                  ...s.log,
                ].slice(0, LOG_LIMIT),
              },
        ),
      min + Math.random() * (max - min),
    );
    return () => clearTimeout(id);
  }, [waitingFor, waitingName]);

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

        // The ticket scanned to open the service is the first half of the
        // match, so the check asks only for the toe tag. Receiving at the
        // chapel is the same match, made by the receiver.
        case "checkTag":
        case "receiveTag": {
          if (!doc || doc.kind !== "tag")
            return reject("Scan the toe tag QR (TAG-…).");
          if (!s.trip || doc.caseId !== s.trip.caseId) {
            // A mismatch here is the whole point of the check, so it goes on
            // the log even though the operator never left the screen.
            const receiving = s.screen === "receiveTag";
            const encasketing = s.stepKey === "encasket";
            const where = receiving
              ? "at chapel receiving"
              : encasketing
                ? "before encasketing"
                : s.pipeline === "embalm"
                  ? "before embalming"
                  : "at departure";
            const entry: LogEntry = {
              text: `Mismatch ${where} · ${doc.code} ≠ ${s.trip?.caseId}`,
              tone: "bad",
              at: stamp(),
            };
            return {
              ...reject(
                `MISMATCH — ${doc.code} is for ${doc.deceased}. ${
                  receiving
                    ? "Do not receive the deceased"
                    : encasketing
                      ? "Do not encasket"
                      : s.pipeline === "embalm"
                        ? "Do not proceed with embalming"
                        : "Do not leave the chapel"
                }; notify the office.`,
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
            if (s.stepKey === "readyConfirm") {
              // The CM/FCR's check before the casket is opened for viewing.
              const entry: LogEntry = {
                text: `Casket mismatch at ready-for-viewing confirmation · ${doc.code} ≠ ${s.trip?.caseId}`,
                tone: "bad",
                at: stamp(),
              };
              return {
                ...reject(
                  `MISMATCH — ${doc.code} is for ${doc.deceased}, but this service is for ${s.trip?.deceased}. Do not open the casket for viewing; notify the office.`,
                ),
                log: [entry, ...s.log].slice(0, LOG_LIMIT),
              };
            }
            if (s.stepKey === "encasket") {
              // The second casket scan is the last check before the deceased
              // goes in, so a wrong one is logged like a toe-tag mismatch.
              const entry: LogEntry = {
                text: `Casket mismatch before encasketing · ${doc.code} ≠ ${s.trip?.caseId}`,
                tone: "bad",
                at: stamp(),
              };
              return {
                ...reject(
                  `MISMATCH — ${doc.code} is for ${doc.deceased}, but toe tag ${s.tag?.code ?? ""} is for ${s.trip?.deceased}. Do not encasket; notify the office.`,
                ),
                log: [entry, ...s.log].slice(0, LOG_LIMIT),
              };
            }
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
                `MISMATCH — ${doc.code} is for ${doc.deceased}, but trip ticket ${s.trip?.code} is for ${s.trip?.deceased}. Check that the deceased in the casket matches the trip ticket. Do not leave the chapel; notify the office.`,
              ),
              log: [entry, ...s.log].slice(0, LOG_LIMIT),
            };
          }
          return accept({ casketTag: doc.code });

        case "scanProcess": {
          // Either QR works at the site — the ticket or the toe tag.
          const tripCode = doc ? findTripCode(doc.caseId) : undefined;
          if (!doc || !tripCode)
            return reject(
              `${code || "That code"} is not a trip ticket or toe tag on file.`,
            );
          // Embalming is opened by the toe tag, never by the ticket.
          if (doc.kind === "embalm")
            return reject(
              "Embalming is opened from the toe tag. Scan the toe tag QR (TAG-…).",
            );
          // The same toe tag scanned once its retrieval is finished moves the
          // service on to embalming, and the request is shown from it.
          const retrievalDone = PIPELINES.retrieval.every(
            (step) => s.progress[`retrieval:${doc.caseId}`]?.[step.key],
          );
          if (doc.kind === "tag" && retrievalDone) {
            const ticket = lookupDoc(findEmbalmCode(doc.caseId) ?? "");
            if (!ticket)
              return reject(
                `Retrieval of ${doc.deceased} is complete, but no embalming request is on file.`,
              );
            return accept({
              trip: ticket,
              tag: doc,
              casketTag: "",
              pipeline: "embalm",
            });
          }
          // A viewing ticket is its own trip; any other document of the
          // service resolves to its retrieval ticket.
          const isViewing = doc.kind === "trip" && doc.tripType === "viewing";
          const service = lookupDoc(isViewing ? doc.code : tripCode);
          if (!service)
            return reject(
              `${code} is not a trip ticket or toe tag on file.`,
            );
          return accept({
            trip: service,
            tag: null,
            casketTag: "",
            pipeline: isViewing ? "viewing" : "retrieval",
          });
        }

        default:
          return s;
      }
    });

  // The camera only runs while the viewfinder is up. Once a code is accepted
  // the record takes its place, and "Scan another QR" brings it back.
  const { camera, retry: retryCamera, zoom } = useCodeScanner({
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
        const times = { ...state.embalmTimes[trip.caseId], ...extra.embalmTimes?.[trip.caseId] };
        go("embalm", {
          // Each service loads its own record, never the last one typed. A new
          // summary takes its times from the Start and Finish taps.
          em: saved
            ? { ...saved }
            : {
                ...emptyEmbalmForm(
                  embalmerFor(trip.caseId),
                  embalmRequestFor(trip.caseId),
                ),
                start: times.start ?? "",
                // Started and finished in the same minute leaves the end for
                // the embalmer, rather than a zero-length procedure.
                end: times.end && times.end > (times.start ?? "") ? times.end : "",
              },
          ...extra,
        });
        return;
      }
      case "photo":
        go("photo", { photoUrl: "", ...extra });
        return;
      case "scanCasket":
        go("scanCasket", { casketTag: "", ...extra });
        return;
      case "endorse":
        go("endorse", {
          // An embalmed deceased goes back to the contracting party on record,
          // so there is no one to pick; once encasketed, to a CM/FCR.
          ...((extra.stepKey ?? state.stepKey) === "endorseFamily"
            ? { receiverRole: CONTRACTING_PARTY, receiverName: trip?.contact ?? "" }
            : { receiverRole: RECEIVER_ROLES[0], receiverName: "" }),
          ...extra,
        });
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
    go("otp", { otp: "", otpSentAt: sentAt, otpFail: "", authVia: "otp" });
    flash(`OTP sent to ${trip.contact}`);
  };

  const requestAppApproval = () => {
    if (!trip) return;
    go("appWait", { otpFail: "", authVia: "app" });
    flash(`Notification sent to ${trip.contact}'s app`);
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
    setState((s) =>
      // The photo taken before embalming is kept with its service, apart
      // from the step photos that each task starts fresh.
      s.screen === "embalmRequest" && s.trip
        ? {
            ...s,
            preEmbalmPhotos: { ...s.preEmbalmPhotos, [s.trip.caseId]: url },
          }
        : { ...s, photoUrl: url },
    );
  };

  /** The summary is filled first, then saved once the casket is scanned. */
  const toCasketScan = () => {
    if (state.em.end <= state.em.start) {
      flash("End time must be after the start time.");
      return;
    }
    completeTask();
  };

  // Only the summary is saved here: the deceased is not encasketed until the
  // family has authorized it.
  const saveEmbalming = () => {
    if (!trip) return;
    setState((s) => ({
      ...s,
      embalmRecords: { ...s.embalmRecords, [trip.caseId]: { ...s.em } },
    }));
    addLog(
      `Embalming summary saved · ${state.casketTag} · ${trip.deceased}`,
      "good",
    );
    completeTask();
  };

  const encasket = () => {
    if (!trip) return;
    addLog(
      `Matched ${tag?.code ?? trip.caseId} ↔ ${state.casketTag} · encasketed · ${trip.deceased}`,
      "good",
    );
    completeTask();
  };

  // ------------------------------------------------------------ scan copy

  const scanKind: ScanKind =
    state.screen === "scanLookup"
      ? "lookup"
      : state.screen === "scanCasket"
      ? "casket"
      : state.screen === "checkTag" || state.screen === "receiveTag"
        ? "checkTag"
        : state.screen === "scanTag"
          ? "tag"
          : state.screen === "scanProcess"
            ? "process"
            : "trip";

  const who = trip?.deceased ?? "this service";
  const encasketing = curStep?.key === "encasket";
  const scanHint =
    scanKind === "lookup"
      ? "Scan the barcode on any casket tag to see who is in the casket and which room they are in."
      : scanKind === "casket"
      ? viewing
        ? `Before leaving the chapel, scan the casket barcode. It must be ${who}'s casket to match trip ticket ${trip?.code ?? ""}.`
        : confirmingReady
          ? `${state.receiverRole}${
              state.receiverName.trim() ? ` ${state.receiverName.trim()}` : ""
            }: confirm ${who} is ready for viewing by scanning the casket barcode.`
        : encasketing
          ? `Scan the casket barcode again. It must be ${who}'s casket to match toe tag ${tag?.code ?? ""}.`
          : `Scan the barcode on the casket tag for ${who} · ${trip?.casket ?? ""}`
      : state.screen === "receiveTag"
        ? `${state.receiverRole}${
            state.receiverName.trim() ? ` ${state.receiverName.trim()}` : ""
          }: confirm receiving ${who} by scanning the toe tag QR.`
        : scanKind === "checkTag"
        ? `${
            encasketing
              ? "Before encasketing"
              : state.pipeline === "embalm"
                ? "Before embalming"
                : "Before leaving the chapel"
          }, scan the toe tag for ${who} to match with ${trip?.code ?? "the ticket"}.`
        : scanKind === "process"
          ? "Scan any QR of the service. The system shows the next step to authorize."
          : scanKind === "tag"
            ? `Scan a second QR to compare with ${
                trip ? `${trip.docType} ${trip.code}` : "the first"
              }.`
            : "Scan any service QR — trip ticket, embalming ticket, toe tag, wristband or casket tag.";

  // ---------------------------------------------------------------- titles

  const titles: Record<Screen, [string, string]> = {
    home: ["Scanner", "Service Verification"],
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
    scanCasket: [
      "Scan Casket Barcode",
      viewing
        ? "Casket matching · before the trip"
        : confirmingReady
          ? `Ready for viewing · ${state.receiverRole}`
        : encasketing
          ? "Encasketing · casket matching"
          : (trip?.deceased ?? ""),
    ],
    checkTag: [
      "Scan Toe Tag",
      encasketing
        ? "Encasketing · toe tag matching"
        : state.pipeline === "embalm"
          ? "Matching · preparation room"
          : "Departure check · at the chapel",
    ],
    endorse: [
      "Endorse Deceased",
      curStep?.key === "endorseFamily"
        ? "To the contracting party · authorize encasketing"
        : curStep?.key === "endorseCm"
          ? "To the CM/FCR · ready for viewing"
          : "Return to chapel · embalming",
    ],
    receiveTag: [
      "Scan Toe Tag",
      `Receiving confirmation · ${state.receiverRole}`,
    ],
    depart: [
      viewing ? "Depart to Viewing Venue" : "Depart to Chapel",
      pipelineLabel,
    ],
    arrive: [
      viewing && !returningToChapel ? "Arrive at Viewing Venue" : "Arrive at Chapel",
      pipelineLabel,
    ],
    embalmRequest: ["Embalming Request", trip?.deceased ?? ""],
    embalm: ["Embalming Summary", "Preparation room"],
    photo: ["Add Deceased Photo", stepLabel],
    authorize: ["Family Authorization", stepLabel],
    appWait: ["Authorize via App", stepLabel],
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
              label: "Stop & Notify the Office",
              tone: "danger",
              onClick: () => {
                addLog(`Office notified · ${trip?.code}`, "bad");
                go("home", { tag: null });
                flash("Office notified. Hold the process until resolved.");
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
          // Until the summary is saved, the toe tag scan opens on the request.
          onClick: () =>
            go(
              state.pipeline === "embalm" && nextStep?.key === "embalm"
                ? "embalmRequest"
                : "processPick",
            ),
        },
      };
      break;
    case "embalmRequest":
      footer =
        nextStep && trip
          ? {
              primary: !procedure
                ? {
                    label: preEmbalmPhoto
                      ? "Start embalming"
                      : "Add photo to start embalming",
                    enabled: !!preEmbalmPhoto,
                    onClick: () => {
                      addLog(`Embalming started · ${trip.deceased}`, "good");
                      setState((s) => ({
                        ...s,
                        embalmTimes: {
                          ...s.embalmTimes,
                          [trip.caseId]: { start: clock(), startedAt: stamp() },
                        },
                      }));
                    },
                  }
                : !procedure.end
                  ? {
                      label: "Finish embalming",
                      onClick: () => {
                        addLog(`Embalming finished · ${trip.deceased}`, "good");
                        const embalmTimes = {
                          ...state.embalmTimes,
                          [trip.caseId]: {
                            ...procedure,
                            end: clock(),
                            endedAt: stamp(),
                          },
                        };
                        // On to the summary, with the finish time already in.
                        openTask(nextStep.tasks[0], {
                          stepKey: nextStep.key,
                          taskIdx: 0,
                          embalmTimes,
                        });
                      },
                    }
                  : {
                      label: "Continue to embalming summary",
                      onClick: () => startStep(nextStep),
                    },
              secondary: {
                label: "Back to menu",
                onClick: () =>
                  go("home", { trip: null, tag: null, pipeline: "" }),
              },
            }
          : null;
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
    case "checkTag":
      footer = {
        primary: {
          label: "Confirm match",
          enabled: !!state.scanned,
          onClick: () => {
            if (!trip || !tag) return;
            addLog(
              `Matched ${trip.code} ↔ ${tag.code} · ${
                encasketing
                  ? "toe tag confirmed for encasketing"
                  : state.pipeline === "embalm"
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
    case "scanCasket":
      footer = {
        primary: viewing
          ? {
              label: "Confirm match · proceed to trip",
              enabled: !!state.scanned,
              onClick: () => {
                if (trip)
                  addLog(
                    `Matched ${trip.code} ↔ ${state.casketTag} · cleared for viewing trip`,
                    "good",
                  );
                completeTask();
              },
            }
          : confirmingReady
            ? {
                label: "Confirm casket",
                enabled: !!state.scanned,
                onClick: completeTask,
              }
          : encasketing
            ? {
                label: "Confirm match · encasket",
                enabled: !!state.scanned,
                onClick: encasket,
              }
            : {
                label: "Save embalming summary",
                enabled: !!state.scanned,
                onClick: saveEmbalming,
              },
      };
      break;
    case "embalm":
      footer = {
        primary: {
          label: "Next: scan casket",
          enabled: embalmReady,
          onClick: toCasketScan,
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
            addLog(
              returningToChapel
                ? `Arrived at chapel from viewing venue · ${trip.deceased} · trip ${trip.code} ended`
                : `Arrived at ${tripToShort} · ${trip.deceased}`,
              "good",
            );
            if (returningToChapel) flash(`Trip ${trip.code} ended.`);
            completeTask();
          },
        },
      };
      break;
    case "endorse":
      footer = {
        primary: {
          label:
            state.receiverRole === CONTRACTING_PARTY
              ? "Endorse to contracting party"
              : `Endorse to ${state.receiverRole}`,
          enabled: !!state.receiverName.trim(),
          onClick: () => {
            if (!trip) return;
            addLog(
              `Endorsed to ${state.receiverRole} ${state.receiverName.trim()} · ${trip.deceased}`,
              "good",
            );
            completeTask();
          },
        },
      };
      break;
    case "receiveTag":
      footer = {
        primary: {
          label: "Confirm toe tag",
          enabled: !!state.scanned,
          onClick: completeTask,
        },
      };
      break;
    case "photo":
      footer = {
        primary: {
          label: receiving
            ? "Confirm received"
            : confirmingReady
              ? "Confirm ready for viewing"
              : "Next",
          enabled: !!state.photoUrl,
          onClick: () => {
            if (receiving && trip)
              addLog(
                `Received at chapel · ${tag?.code ?? trip.caseId} · by ${state.receiverRole} ${state.receiverName.trim()}`,
                "good",
              );
            if (confirmingReady && trip) {
              addLog(
                `Ready for viewing · ${trip.deceased} · confirmed by ${state.receiverRole} ${state.receiverName.trim()}`,
                "good",
              );
              flash(`${trip.deceased} is ready for viewing.`);
            }
            completeTask();
          },
        },
      };
      break;
    case "authorize":
      footer = {
        primary: { label: "Send OTP to family", onClick: sendOtp },
        secondary: { label: "Authorize via App", onClick: requestAppApproval },
      };
      break;
    case "appWait":
      footer = {
        primary: {
          label: "Waiting for family…",
          enabled: false,
          onClick: () => {},
        },
        secondary: {
          label: "Cancel · use OTP instead",
          onClick: () => go("authorize", { otp: "", otpFail: "" }),
        },
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
                zoom={zoom}
                onRetryCamera={retryCamera}
                onRescan={rescan}
                scannedCode={state.scanned}
                scannedLabel={lookupDoc(state.scanned)?.docType ?? "QR"}
                error={state.scanError}
                manual={state.manual}
                placeholder="e.g. WB-2026-000123"
                samples={sampleCodes(scanKind)}
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
                fromLabel={
                  returningToChapel
                    ? "the viewing venue"
                    : viewing
                      ? "the chapel"
                      : "the retrieval site"
                }
                toLabel={viewing && !returningToChapel ? "the viewing venue" : "the chapel"}
                from={
                  returningToChapel
                    ? (trip.destination ?? "Viewing venue")
                    : (trip.pickup ?? "Retrieval site")
                }
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

            {state.screen === "endorse" &&
              trip &&
              (curStep?.key === "endorseFamily" ? (
                <EndorseScreen
                  intro={`Embalming is done. Endorse ${trip.deceased} to the contracting party for viewing before encasketing. They authorize encasketing in the next step with an OTP or in their app.`}
                  rows={[
                    ["Deceased", trip.deceased ?? "—"],
                    ["Service ID", trip.caseId],
                    ["Toe tag", tag?.code ?? findTagCode(trip.caseId) ?? "—"],
                    ["Casket", casketDoc?.code ?? "—"],
                    ["Endorsed to", trip.contact ?? "—"],
                    [
                      "Endorsed by",
                      state.embalmRecords[trip.caseId]?.embalmer ||
                        (trip.embalmer ?? "—"),
                    ],
                  ]}
                />
              ) : curStep?.key === "endorseCm" ? (
                <EndorseScreen
                  intro={`Encasketing is done. Endorse ${trip.deceased} to the CM/FCR on duty. They confirm the deceased is ready for viewing in the next step by scanning the casket barcode and taking a photo.`}
                  picker={{
                    roles: [RECEIVER_ROLES[0]],
                    role: state.receiverRole,
                    onRoleChange: () => {},
                    people: RECEIVERS[RECEIVER_ROLES[0]] ?? [],
                    name: state.receiverName,
                    onNameChange: (receiverName) =>
                      setState((s) => ({ ...s, receiverName })),
                  }}
                  rows={[
                    ["Deceased", trip.deceased ?? "—"],
                    ["Service ID", trip.caseId],
                    ["Toe tag", tag?.code ?? findTagCode(trip.caseId) ?? "—"],
                    ["Casket", casketDoc?.code ?? "—"],
                    ["Room", casketDoc?.room ?? "—"],
                    [
                      "Endorsed by",
                      state.embalmRecords[trip.caseId]?.embalmer ||
                        (trip.embalmer ?? "—"),
                    ],
                  ]}
                />
              ) : (
                <EndorseScreen
                  intro="Return to chapel · embalming. Endorse the deceased to the CM/FCR or the guard on duty. They confirm receiving in the next step by scanning the toe tag QR and taking a photo."
                  picker={{
                    roles: RECEIVER_ROLES,
                    role: state.receiverRole,
                    // A name picked for one role is not on the other's list.
                    onRoleChange: (receiverRole) =>
                      setState((s) => ({ ...s, receiverRole, receiverName: "" })),
                    people: RECEIVERS[state.receiverRole] ?? [],
                    name: state.receiverName,
                    onNameChange: (receiverName) =>
                      setState((s) => ({ ...s, receiverName })),
                  }}
                  rows={[
                    ["Deceased", trip.deceased ?? "—"],
                    ["Service ID", trip.caseId],
                    ["Toe tag", tag?.code ?? findTagCode(trip.caseId) ?? "—"],
                    ["Endorsed by", trip.driver ?? "—"],
                  ]}
                />
              ))}

            {state.screen === "embalmRequest" && trip && (
              <EmbalmRequestScreen
                name={trip.deceased ?? ""}
                meta={`${trip.caseId} · DOD ${trip.dod ?? "—"}`}
                active={!!procedure && !procedure.end}
                status={
                  !procedure
                    ? "For embalming · not yet started"
                    : !procedure.end
                      ? `Embalming on process · started ${procedure.startedAt}`
                      : `Embalming finished ${procedure.endedAt ?? ""} · summary pending`
                }
                rows={[
                  ["Toe tag", tag?.code ?? "—"],
                  ["Embalming ticket", trip.code],
                  ["Preparation room", trip.prepRoom ?? "—"],
                  ["Scheduled", trip.scheduled ?? "—"],
                  ["Embalmer", trip.embalmer ?? "—"],
                ]}
                requested={embalmRequest}
              />
            )}

            {/* The deceased is photographed as received, before any work. */}
            {state.screen === "embalmRequest" &&
              trip &&
              (procedure ? (
                preEmbalmPhoto && (
                  <PhotoViewer
                    label="Photo before embalming"
                    caption={`${trip.deceased ?? ""} · taken before the start at ${procedure.startedAt}`}
                    photoUrl={preEmbalmPhoto}
                  />
                )
              ) : (
                <PhotoScreen
                  showSample={false}
                  photoUrl={preEmbalmPhoto}
                  onPick={pickPhoto}
                  hint="Required before embalming: take a photo of the deceased as received in the preparation room."
                  rule={`Deceased's face and the toe tag${tag ? ` (${tag.code})` : ""} must be visible in the photo.`}
                />
              ))}

            {state.screen === "embalm" && trip && (
              <EmbalmScreen
                name={trip.deceased ?? ""}
                meta={`${trip.caseId} · DOD ${trip.dod ?? "—"}`}
                requested={embalmRequest}
                value={state.em}
                onChange={(em) => setState((s) => ({ ...s, em }))}
              />
            )}

            {state.screen === "photo" && (
              <PhotoScreen
                showSample={!receiving && !confirmingReady}
                photoUrl={state.photoUrl}
                onPick={pickPhoto}
                hint={
                  receiving
                    ? `${state.receiverRole}: take a photo of the deceased as received at the chapel, before endorsing for embalming.`
                    : confirmingReady
                      ? `${state.receiverRole}: take a photo of the deceased in the casket, ready for viewing.`
                      : "Driver: hold the toe tag in front of the camera with the deceased in the background. The tag is attached after family authorization."
                }
                rule={
                  receiving
                    ? `Deceased's face and the attached toe tag${tag ? ` (${tag.code})` : ""} must be visible in the photo.`
                    : confirmingReady
                      ? "Deceased's face and the casket must be visible in the photo."
                      : `Toe tag QR${tag ? ` (${tag.code})` : ""} in focus in front, deceased's face visible behind it.`
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

            {state.screen === "appWait" && trip && (
              <AppWaitScreen
                stepLabel={stepLabel || "this step"}
                contactName={trip.contact ?? "the family"}
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
                      ? curStep?.key === "viewtrip"
                        ? `${trip.contact} confirmed ${
                            state.authVia === "app" ? "in the app " : ""
                          }that ${trip.deceased} has been brought to the viewing venue. Return to the chapel to end the trip.`
                        : `${stepLabel || "This step"} approved ${
                            state.authVia === "app" ? "in the app " : ""
                          }by ${trip.contact}. ${
                            curStep?.key === "tagging"
                              ? "Attach the toe tag to the deceased and proceed with the retrieval."
                              : curStep?.key === "endorseFamily"
                                ? "Proceed with encasketing."
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
