/**
 * The service records the Personnel Scan flow resolves QR codes against.
 *
 * This is the demo set from the design. When the flow moves onto real data,
 * `lookupDoc` is the single seam: every screen asks it what a scanned code is
 * and which service it belongs to.
 */

export type Pipeline = "retrieval" | "embalm";

/** What a code's prefix says it is. Drives every validation in the flow. */
export type DocKind = "trip" | "embalm" | "tag" | "wb" | "ck";

type TripRecord = {
  caseId: string;
  deceased: string;
  vehicle: string;
  driver: string;
  departure: string;
  dob: string;
  dod: string;
  pickup: string;
  casket: string;
  contact: string;
  phone: string;
};

type EmbalmTicketRecord = {
  caseId: string;
  prepRoom: string;
  embalmer: string;
  scheduled: string;
};

/**
 * A resolved document: the record for the code itself, over the trip record of
 * the service it belongs to. A toe tag therefore knows the date of death and
 * the family contact, which is what the review and OTP steps need.
 */
export type ServiceDoc = Partial<TripRecord> &
  Partial<EmbalmTicketRecord> & {
    code: string;
    docType: string;
    kind: DocKind;
    caseId: string;
  };

const TRIPS: Record<string, TripRecord> = {
  "TT-2026-000123": {
    caseId: "RET-2026-00123",
    deceased: "Juan Dela Cruz",
    vehicle: "VAN-001",
    driver: "Reyes, Mario",
    departure: "2026-09-12 08:30 AM",
    dob: "1965-03-14 (61)",
    dod: "2026-09-11 14:20",
    pickup: "Quezon City General Hospital · Morgue",
    casket: "ST. HYACINTH · Wood",
    contact: "Maria Dela Cruz",
    phone: "0917 *** 4521",
  },
  "TT-2026-000124": {
    caseId: "RET-2026-00124",
    deceased: "Rosario Magbanua",
    vehicle: "VAN-001",
    driver: "Reyes, Mario",
    departure: "2026-09-12 01:00 PM",
    dob: "1948-07-02 (78)",
    dod: "2026-09-11 22:05",
    pickup: "Residence · Brgy. Holy Spirit, QC",
    casket: "ST. DOROTHY · Wood",
    contact: "Arnel Magbanua",
    phone: "0928 *** 1187",
  },
};

const EMBALM_TICKETS: Record<string, EmbalmTicketRecord> = {
  "ET-2026-000123": {
    caseId: "RET-2026-00123",
    prepRoom: "Preparation Room 1",
    embalmer: "Santos, Rodel",
    scheduled: "2026-09-12 11:00 AM",
  },
  "ET-2026-000124": {
    caseId: "RET-2026-00124",
    prepRoom: "Preparation Room 2",
    embalmer: "Aquino, Liza",
    scheduled: "2026-09-12 04:00 PM",
  },
};

const TAGS: Record<string, { caseId: string; deceased: string }> = {
  "TAG-2026-000123": { caseId: "RET-2026-00123", deceased: "Juan Dela Cruz" },
  "TAG-2026-000124": { caseId: "RET-2026-00124", deceased: "Rosario Magbanua" },
  "TAG-2026-000456": {
    caseId: "RET-2026-00456",
    deceased: "Leonora Batungbakal",
  },
};

/** Wristbands and casket tags carry nothing of their own but the service. */
const EXTRA_DOCS: Record<string, { caseId: string }> = {
  "WB-2026-000123": { caseId: "RET-2026-00123" },
  "CK-2026-000123": { caseId: "RET-2026-00123" },
  "WB-2026-000124": { caseId: "RET-2026-00124" },
};

const DOC_TYPES: Record<string, string> = {
  TT: "Trip Ticket",
  ET: "Embalming Ticket",
  TAG: "Toe Tag",
  WB: "Wristband",
  CK: "Casket Tag",
};

/** Every QR in the flow resolves through here, or it is not on file. */
export function lookupDoc(raw: string): ServiceDoc | null {
  const code = String(raw ?? "")
    .trim()
    .toUpperCase();
  const record =
    TRIPS[code] ?? EMBALM_TICKETS[code] ?? TAGS[code] ?? EXTRA_DOCS[code];
  if (!record) return null;

  const prefix = code.split("-")[0];
  const base: Partial<TripRecord> =
    Object.values(TRIPS).find((trip) => trip.caseId === record.caseId) ?? {};
  const kind: DocKind =
    prefix === "TT"
      ? "trip"
      : prefix === "ET"
        ? "embalm"
        : (prefix.toLowerCase() as DocKind);

  return {
    ...base,
    ...record,
    code,
    docType: DOC_TYPES[prefix] ?? "Document",
    kind,
  };
}

export function findTripCode(caseId: string): string | undefined {
  return Object.keys(TRIPS).find((code) => TRIPS[code].caseId === caseId);
}

export function findTagCode(caseId: string): string | undefined {
  return Object.keys(TAGS).find((code) => TAGS[code].caseId === caseId);
}

/** The embalmer the ticket already names, pre-filled on the summary form. */
export function embalmerFor(caseId: string): string {
  const ticket = Object.keys(EMBALM_TICKETS).find(
    (code) => EMBALM_TICKETS[code].caseId === caseId,
  );
  return ticket ? EMBALM_TICKETS[ticket].embalmer : "";
}

/** Which of the seven scan screens is showing, for hint and sample copy. */
export type ScanKind =
  | "trip"
  | "tag"
  | "process"
  | "attach"
  | "checkTrip"
  | "checkTag"
  | "casket";

/** Codes offered as one-tap chips under the manual entry box. */
export function sampleCodes(kind: ScanKind, pipeline: Pipeline | ""): string[] {
  switch (kind) {
    case "casket":
      return ["CK-2026-000123"];
    case "checkTrip":
      return Object.keys(pipeline === "embalm" ? EMBALM_TICKETS : TRIPS);
    case "checkTag":
    case "attach":
      return Object.keys(TAGS);
    case "process":
      return ["TT-2026-000123", "ET-2026-000123", "TAG-2026-000123"];
    default:
      return [
        "TT-2026-000123",
        "ET-2026-000123",
        "TAG-2026-000123",
        "WB-2026-000123",
        "CK-2026-000123",
        "TAG-2026-000456",
      ];
  }
}

/** A screen the personnel completes as one task inside a pipeline step. */
export type TaskScreen =
  | "checkTrip"
  | "checkTag"
  | "scanAttach"
  | "photo"
  | "review"
  | "depart"
  | "arrive"
  | "embalm"
  | "scanCasket"
  | "casket";

export type PipelineStep = {
  key: string;
  label: string;
  hint: string;
  tasks: TaskScreen[];
  /** `false` for the matching steps, which close without a family code. */
  otp?: boolean;
};

/**
 * The scanned service decides its own next step — personnel never pick one.
 * Progress is tracked per pipeline, so embalming never inherits retrieval's
 * toe-tag step. Every step but the matching checks ends with a family OTP.
 */
export const PIPELINES: Record<Pipeline, PipelineStep[]> = {
  retrieval: [
    {
      key: "depcheck",
      label: "Departure check",
      hint: "Before leaving the chapel · scan trip ticket and toe tag to match",
      tasks: ["checkTrip", "checkTag"],
      otp: false,
    },
    {
      key: "tagging",
      label: "Toe tagging & retrieval",
      hint: "Scan toe tag, photo of tag with deceased, family review · family OTP, then attach",
      tasks: ["scanAttach", "photo", "review"],
    },
    {
      key: "transfer",
      label: "Transfer to chapel",
      hint: "Depart and arrive · family OTP on handover",
      tasks: ["depart", "arrive"],
    },
  ],
  embalm: [
    {
      key: "embcheck",
      label: "Embalming ticket & toe tag matching",
      hint: "Before embalming · scan embalming ticket and toe tag to match",
      tasks: ["checkTrip", "checkTag"],
      otp: false,
    },
    {
      key: "embalm",
      label: "Embalming & casketing",
      hint: "Embalming summary, casketing, photo of deceased · family OTP to proceed",
      tasks: ["embalm", "scanCasket", "casket", "photo"],
    },
  ],
};

export const EMBALMERS = [
  "",
  "Santos, Rodel",
  "Villanueva, Jun",
  "Aquino, Liza",
];
export const EMBALM_METHODS = ["Arterial", "Cavity", "Hypodermic", "Surface"];
export const BODY_CONDITIONS = [
  "Good",
  "Fair",
  "Discoloration",
  "Early decomposition",
  "Trauma",
];

/** The signed-in personnel. Demo values until the flow reads the session. */
export const OPERATOR = {
  greetingName: "Mario",
  initials: "MR",
  role: "Driver · VAN-001 · Commonwealth",
};

export const DESTINATION_CHAPEL = "St. Peter Chapel · Commonwealth";

export const DEMO_OTP = "123456";
export const OTP_TTL_MS = 10 * 60 * 1000;
