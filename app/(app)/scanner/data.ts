/**
 * The service records the Personnel Scan flow resolves QR codes against.
 *
 * This is the demo set from the design. When the flow moves onto real data,
 * `lookupDoc` is the single seam: every screen asks it what a scanned code is
 * and which service it belongs to.
 */

export type Pipeline = "retrieval" | "embalm" | "viewing";

/**
 * What a trip ticket is for. A retrieval brings the deceased in to the chapel;
 * a viewing takes the casket out of the chapel to a wake held elsewhere.
 */
export type TripType = "retrieval" | "viewing";

/** What a code's prefix says it is. Drives every validation in the flow. */
export type DocKind = "trip" | "embalm" | "tag" | "wb" | "ck";

type TripRecord = {
  caseId: string;
  tripType: TripType;
  deceased: string;
  vehicle: string;
  driver: string;
  departure: string;
  dob: string;
  dod: string;
  pickup: string;
  /** Where a viewing trip delivers the casket. Retrievals end at the chapel. */
  destination?: string;
  casket: string;
  contact: string;
  phone: string;
};

export type HandPosition = "side" | "stomach";
export type ClothesDisposition = "surrender_to_family" | "proper_disposal";

/** What the family asked for on the embalming ticket. */
export type EmbalmRequest = {
  handPosition: HandPosition;
  shaveFacialHair: boolean;
  trimNails: boolean;
  hairDye: boolean;
  clothesDisposition: ClothesDisposition;
};

type EmbalmTicketRecord = {
  caseId: string;
  prepRoom: string;
  embalmer: string;
  scheduled: string;
  requested: EmbalmRequest;
};

/** Where a casketed deceased lies in state, keyed by the casket tag. */
type CasketRecord = {
  caseId: string;
  chapel: string;
  room: string;
  floor: string;
  viewing: string;
  interment: string;
  roomStatus: string;
};

/**
 * A resolved document: the record for the code itself, over the trip record of
 * the service it belongs to. A toe tag therefore knows the date of death and
 * the family contact, which is what the review and OTP steps need.
 */
export type ServiceDoc = Partial<TripRecord> &
  Partial<EmbalmTicketRecord> &
  Partial<CasketRecord> & {
    code: string;
    docType: string;
    kind: DocKind;
    caseId: string;
  };

const TRIPS: Record<string, TripRecord> = {
  "REV-2026-000123": {
    caseId: "RET-2026-00123",
    tripType: "retrieval",
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
  "REV-2026-000124": {
    caseId: "RET-2026-00124",
    tripType: "retrieval",
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
  "VIE-2026-000125": {
    caseId: "RET-2026-00123",
    tripType: "viewing",
    deceased: "Juan Dela Cruz",
    vehicle: "HEARSE-02",
    driver: "Reyes, Mario",
    departure: "2026-09-14 07:00 AM",
    dob: "1965-03-14 (61)",
    dod: "2026-09-11 14:20",
    pickup: "St. Peter Chapel · Commonwealth · Chapel 3",
    destination: "Residence · Brgy. Batasan Hills, QC",
    casket: "ST. HYACINTH · Wood",
    contact: "Maria Dela Cruz",
    phone: "0917 *** 4521",
  },
};

const EMBALM_TICKETS: Record<string, EmbalmTicketRecord> = {
  "ET-2026-000123": {
    caseId: "RET-2026-00123",
    prepRoom: "Preparation Room 1",
    embalmer: "Santos, Rodel",
    scheduled: "2026-09-12 11:00 AM",
    requested: {
      handPosition: "stomach",
      shaveFacialHair: true,
      trimNails: true,
      hairDye: false,
      clothesDisposition: "surrender_to_family",
    },
  },
  "ET-2026-000124": {
    caseId: "RET-2026-00124",
    prepRoom: "Preparation Room 2",
    embalmer: "Aquino, Liza",
    scheduled: "2026-09-12 04:00 PM",
    requested: {
      handPosition: "side",
      shaveFacialHair: false,
      trimNails: true,
      hairDye: true,
      clothesDisposition: "proper_disposal",
    },
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

const CASKETS: Record<string, CasketRecord> = {
  "CK-2026-000123": {
    caseId: "RET-2026-00123",
    chapel: "St. Peter Chapel · Commonwealth",
    room: "Chapel 3 · St. Joseph",
    floor: "2nd floor",
    viewing: "Sep 13 – Sep 16, 2026",
    interment: "Sep 17, 2026 · 9:00 AM",
    roomStatus: "Occupied · wake ongoing",
  },
  "CK-2026-000124": {
    caseId: "RET-2026-00124",
    chapel: "St. Peter Chapel · Commonwealth",
    room: "Chapel 5 · St. Therese",
    floor: "Ground floor",
    viewing: "Sep 13 – Sep 15, 2026",
    interment: "Sep 16, 2026 · 10:00 AM",
    roomStatus: "Reserved · being prepared",
  },
};

/** Wristbands carry nothing of their own but the service. */
const EXTRA_DOCS: Record<string, { caseId: string }> = {
  "WB-2026-000123": { caseId: "RET-2026-00123" },
  "WB-2026-000124": { caseId: "RET-2026-00124" },
};

const DOC_TYPES: Record<string, string> = {
  REV: "Retrieval Trip Ticket",
  VIE: "Viewing Trip Ticket",
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
    TRIPS[code] ??
    EMBALM_TICKETS[code] ??
    TAGS[code] ??
    CASKETS[code] ??
    EXTRA_DOCS[code];
  if (!record) return null;

  const prefix = code.split("-")[0];
  // Documents other than a trip ticket inherit the retrieval trip's record.
  const base: Partial<TripRecord> =
    Object.values(TRIPS).find(
      (trip) => trip.caseId === record.caseId && trip.tripType === "retrieval",
    ) ?? {};
  const kind: DocKind =
    prefix === "REV" || prefix === "VIE"
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

/** The retrieval ticket of a service — the trip a toe tag belongs to. */
export function findTripCode(caseId: string): string | undefined {
  return Object.keys(TRIPS).find(
    (code) =>
      TRIPS[code].caseId === caseId && TRIPS[code].tripType === "retrieval",
  );
}

/** The outside viewing ticket of a service, when its wake is held elsewhere. */
export function findViewingTripCode(caseId: string): string | undefined {
  return Object.keys(TRIPS).find(
    (code) =>
      TRIPS[code].caseId === caseId && TRIPS[code].tripType === "viewing",
  );
}

/** The embalming ticket of a service — where a finished retrieval goes next. */
export function findEmbalmCode(caseId: string): string | undefined {
  return Object.keys(EMBALM_TICKETS).find(
    (code) => EMBALM_TICKETS[code].caseId === caseId,
  );
}

/** The casket tag of a service — what the family scans before the viewing. */
export function findCasketCode(caseId: string): string | undefined {
  return Object.keys(CASKETS).find((code) => CASKETS[code].caseId === caseId);
}

export function findTagCode(caseId: string): string | undefined {
  return Object.keys(TAGS).find((code) => TAGS[code].caseId === caseId);
}

function embalmTicketFor(caseId: string): EmbalmTicketRecord | undefined {
  return Object.values(EMBALM_TICKETS).find(
    (ticket) => ticket.caseId === caseId,
  );
}

/** The embalmer the ticket already names, pre-filled on the summary form. */
export function embalmerFor(caseId: string): string {
  return embalmTicketFor(caseId)?.embalmer ?? "";
}

/** No request on file reads as the plainest preparation. */
const NO_REQUEST: EmbalmRequest = {
  handPosition: "side",
  shaveFacialHair: false,
  trimNails: false,
  hairDye: false,
  clothesDisposition: "surrender_to_family",
};

/** What the ticket asked for — the "Requested" column of the summary. */
export function embalmRequestFor(caseId: string): EmbalmRequest {
  return embalmTicketFor(caseId)?.requested ?? NO_REQUEST;
}

/** Which kind of scan screen is showing, for hint and sample copy. */
export type ScanKind =
  | "lookup"
  | "trip"
  | "tag"
  | "process"
  | "checkTag"
  | "casket";

/** Codes offered as one-tap chips under the manual entry box. */
export function sampleCodes(kind: ScanKind): string[] {
  switch (kind) {
    case "casket":
    case "lookup":
      return Object.keys(CASKETS);
    case "checkTag":
      return Object.keys(TAGS);
    case "process":
      return [
        "REV-2026-000123",
        "VIE-2026-000125",
        "TAG-2026-000123",
        "TAG-2026-000124",
      ];
    default:
      return [
        "REV-2026-000123",
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
  | "checkTag"
  | "endorse"
  | "receiveTag"
  | "photo"
  | "depart"
  | "arrive"
  | "embalm"
  | "scanCasket";

export type PipelineStep = {
  key: string;
  label: string;
  hint: string;
  tasks: TaskScreen[];
  /** `false` for the steps that close without a family code. */
  otp?: boolean;
  /** What a closed step reads as in the list. Defaults by `otp`. */
  doneLabel?: string;
};

/**
 * The scanned service decides its own next step — personnel never pick one.
 * Progress is tracked per pipeline, so embalming never inherits retrieval's
 * toe-tag step. Only the toe tagging, the arrival at an outside viewing venue
 * and the embalmed deceased's endorsement to the family end with a family OTP.
 */
export const PIPELINES: Record<Pipeline, PipelineStep[]> = {
  retrieval: [
    {
      key: "depcheck",
      label: "Departure check",
      hint: "Before leaving the chapel · scan the toe tag to match the trip ticket",
      tasks: ["checkTag"],
      otp: false,
    },
    {
      key: "tagging",
      label: "Toe tagging & retrieval",
      hint: "Photo of tag with deceased · family authorization, then attach",
      tasks: ["photo"],
    },
    {
      key: "transfer",
      label: "Transfer to chapel",
      hint: "Depart the retrieval site and confirm arrival at the chapel",
      tasks: ["depart", "arrive"],
      otp: false,
      doneLabel: "Arrived",
    },
    {
      key: "endorse",
      label: "Endorse to CM/FCR or Guard",
      hint: "Return to chapel · embalming · hand the deceased over to the CM/FCR or guard on duty",
      tasks: ["endorse"],
      otp: false,
      doneLabel: "Endorsed",
    },
    {
      key: "receive",
      label: "Receiving confirmation",
      hint: "CM/FCR or guard scans the toe tag QR and takes a photo of the deceased",
      tasks: ["receiveTag", "photo"],
      otp: false,
      doneLabel: "Received",
    },
  ],
  viewing: [
    {
      key: "casketcheck",
      label: "Casket & trip ticket matching",
      hint: "Before leaving the chapel · scan the casket barcode to match the trip ticket",
      tasks: ["scanCasket"],
      otp: false,
    },
    {
      key: "viewtrip",
      label: "Trip to viewing venue",
      // The family's part of the trip is confirming the deceased reached the
      // wake, so their OTP closes the arrival rather than opening the trip.
      hint: "Depart the chapel and arrive at the venue · family confirms the deceased has been brought to the viewing venue",
      tasks: ["depart", "arrive"],
      doneLabel: "Family confirmed",
    },
    {
      key: "returnArrive",
      label: "Arrival at chapel",
      hint: "Confirm arrival at the chapel from the viewing venue · ends the trip",
      tasks: ["arrive"],
      otp: false,
      doneLabel: "Arrived · trip ended",
    },
  ],
  // Opened by the toe tag once the retrieval is finished: the tag scan shows
  // the embalming request, so there is no separate ticket check. The casket
  // is only checked against the service with the summary; the deceased goes
  // into it once the family has authorized encasketing.
  embalm: [
    {
      key: "embalm",
      label: "Embalming summary",
      hint: "Record what was performed and scan the casket barcode · saves the summary",
      tasks: ["embalm", "scanCasket"],
      otp: false,
      doneLabel: "Summary saved",
    },
    {
      key: "endorseFamily",
      label: "Endorse to contracting party",
      hint: "Hand the embalmed deceased over to the contracting party · their OTP authorizes encasketing",
      tasks: ["endorse"],
    },
    {
      key: "encasket",
      label: "Encasketing",
      hint: "Scan the toe tag and the casket barcode again · encasket when both match",
      tasks: ["checkTag", "scanCasket"],
      otp: false,
      doneLabel: "Encasketed",
    },
    {
      key: "endorseCm",
      label: "Endorse to CM/FCR",
      hint: "Hand the encasketed deceased over to the CM/FCR on duty",
      tasks: ["endorse"],
      otp: false,
      doneLabel: "Endorsed",
    },
    {
      key: "readyConfirm",
      label: "Ready for viewing confirmation",
      hint: "CM/FCR scans the toe tag QR and takes a photo of the deceased in the casket",
      tasks: ["receiveTag", "photo"],
      otp: false,
      doneLabel: "Ready for viewing",
    },
  ],
};

/** Who at the chapel can receive the deceased from the retrieval crew. */
export const RECEIVER_ROLES = ["CM/FCR", "Guard"];

/** The staff on duty in each receiving role, picked rather than typed. */
export const RECEIVERS: Record<string, string[]> = {
  "CM/FCR": ["Cruz, Ana", "Mendoza, Carlo", "Garcia, Liza"],
  Guard: ["Ramos, Ben", "Torres, Jun", "Bautista, Rey"],
};

/**
 * Who the embalmed deceased is endorsed to: the contracting party on the
 * service (`contact`), the same person who authorizes each step.
 */
export const CONTRACTING_PARTY = "Contracting party";

export const EMBALMERS = [
  "",
  "Santos, Rodel",
  "Villanueva, Jun",
  "Aquino, Liza",
];

export const DESTINATION_CHAPEL = "St. Peter Chapel · Commonwealth";

export const DEMO_OTP = "123456";
export const OTP_TTL_MS = 10 * 60 * 1000;

/**
 * The service links sent to families, keyed by the unguessable token in the
 * URL. The last name is what the family types to open the page; it is checked
 * on the server and never sent to the browser.
 */
const SERVICE_LINKS: Record<string, { caseId: string; lastName: string }> = {
  q7k2m9xr4d: { caseId: "RET-2026-00123", lastName: "Dela Cruz" },
  h3w8n5tb6c: { caseId: "RET-2026-00124", lastName: "Magbanua" },
};

export function serviceLink(
  token: string,
): { caseId: string; lastName: string } | null {
  return SERVICE_LINKS[token] ?? null;
}
