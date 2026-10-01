"use server";

import {
  embalmRequestFor,
  findCasketCode,
  findEmbalmCode,
  findTagCode,
  findTripCode,
  lookupDoc,
  serviceLink,
  type EmbalmRequest,
} from "@/app/(app)/scanner/data";

/**
 * The family's side of the service: toe tag verification, then the service
 * home where they authorize each later step. Every call re-checks the last
 * name against the link, so nothing about the deceased reaches a browser that
 * has not passed it — and the home is only released once the toe tag is
 * confirmed.
 *
 * Attempts, confirmations and uploads are held in memory: this is the demo
 * seam, and a server restart clears them. When the flow moves onto real data
 * they become fields on the service record.
 */

const MAX_ATTEMPTS = 5;
/** A locked link reopens on its own, so a family is never shut out for good. */
const LOCK_MS = 15 * 60 * 1000;
/** How long an upload reads "Under review" before the demo accepts it. */
const REVIEW_MS = 2500;

const failedAttempts = new Map<string, { count: number; lockedUntil: number }>();
/** caseId -> step id -> when the family confirmed it. */
const confirmations = new Map<string, Record<string, string>>();
/** caseId -> document id -> the file sent and when. */
const uploads = new Map<string, Record<string, { file: string; at: number }>>();

/** The photo taken at retrieval. The design's stands in until uploads persist. */
const DEMO_PHOTO = "/images/deceased-toetag.png";

/** What the portal knows that the scan records do not, per service. */
const FAMILY_DEMO: Record<
  string,
  {
    relationship: string;
    embalmingCompleted: string;
    outcome: string;
    remarks: string;
  }
> = {
  "RET-2026-00123": {
    relationship: "Spouse",
    embalmingCompleted: "Sep 12, 2026 · 1:20 PM",
    outcome: "Normal",
    remarks: "Light restorative work on left cheek",
  },
  "RET-2026-00124": {
    relationship: "Son",
    embalmingCompleted: "Sep 12, 2026 · 6:05 PM",
    outcome: "Normal",
    remarks: "—",
  },
};

const LOCKED_MESSAGE =
  "Too many incorrect attempts. Please try again in 15 minutes, or contact St. Peter.";

const REQUEST_LABELS: [keyof EmbalmRequest, string, Record<string, string>][] = [
  ["handPosition", "Hand position", { side: "Side", stomach: "Stomach" }],
  ["shaveFacialHair", "Shave", { true: "Yes", false: "No" }],
  ["trimNails", "Trim nails", { true: "Yes", false: "No" }],
  ["hairDye", "Hair dye", { true: "Yes", false: "No" }],
  [
    "clothesDisposition",
    "Clothes",
    { surrender_to_family: "Surrender", proper_disposal: "Disposal" },
  ],
];

export type StepId = "tag" | "embalm" | "casket";

export type ServiceSummary = {
  caseId: string;
  deceased: string;
  /** Set once the family has confirmed the toe tag. */
  confirmedAt: string;
};

export type TagDetails = {
  code: string;
  caseId: string;
  deceased: string;
  life: string;
  chapel: string;
  retrieved: string;
  photoUrl: string;
};

export type DocState = { file: string; status: "review" | "ok" };

export type ServiceHome = {
  caseId: string;
  deceased: string;
  life: string;
  chapel: string;
  tag: string;
  /** step id -> confirmation time, for the steps already done. */
  done: Partial<Record<StepId, string>>;
  docs: Record<string, DocState>;
  embalming: {
    embalmer: string;
    completed: string;
    casketDesign: string;
    photoUrl: string;
    /** [item, requested, actual] */
    rows: [string, string, string][];
    outcome: string;
    remarks: string;
  };
  casket: { casketDesign: string };
  profile: [string, string][];
};

export type Fail = {
  ok: false;
  error: string;
  /** The QR belongs to another service — the case the check exists for. */
  mismatch?: boolean;
  locked?: boolean;
};

/** Spacing, case and punctuation do not count: "dela cruz" opens "Dela Cruz". */
function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-zÀ-ɏ]/g, "");
}

function stamp(): string {
  return new Date().toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** "1965-03-14 (61)" -> "March 14, 1965". */
function longDate(value: string | undefined): string {
  const iso = value?.slice(0, 10);
  if (!iso) return "—";
  const date = new Date(`${iso}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value!
    : date.toLocaleDateString("en-PH", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
}

/** "2026-09-12 08:30 AM" -> "Sep 12, 2026 · 8:30 AM". */
function shortDateTime(value: string | undefined): string {
  if (!value) return "—";
  const [day, ...time] = value.split(" ");
  const date = new Date(`${day}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  const label = date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${label} · ${time.join(" ").replace(/^0/, "")}`;
}

function authorize(token: string, lastName: string): { caseId: string } | Fail {
  const link = serviceLink(token);
  if (!link) return { ok: false, error: "This service link is not valid." };
  const now = Date.now();
  const tries = failedAttempts.get(token);
  if (tries && tries.lockedUntil > now)
    return { ok: false, error: LOCKED_MESSAGE, locked: true };
  // Families often type the full name they know rather than the last name
  // alone, so "Juan Dela Cruz" opens the link as well as "Dela Cruz".
  const typed = normalize(lastName);
  const fullName = lookupDoc(findTripCode(link.caseId) ?? "")?.deceased ?? "";
  const known = [link.lastName, fullName].filter(Boolean).map(normalize);
  if (!known.includes(typed)) {
    // A lock that has run out starts the count again.
    const count = (tries && tries.lockedUntil === 0 ? tries.count : 0) + 1;
    const left = MAX_ATTEMPTS - count;
    failedAttempts.set(token, {
      count: left > 0 ? count : 0,
      lockedUntil: left > 0 ? 0 : now + LOCK_MS,
    });
    return left > 0
      ? {
          ok: false,
          error: `That last name doesn't match this service link. Please check the spelling and try again. ${left} attempt${
            left === 1 ? "" : "s"
          } left.`,
        }
      : { ok: false, error: LOCKED_MESSAGE, locked: true };
  }
  failedAttempts.delete(token);
  return { caseId: link.caseId };
}

function chapelOf(caseId: string): string {
  const casket = lookupDoc(findCasketCode(caseId) ?? "");
  return casket?.chapel
    ? `${casket.chapel}${casket.room ? ` · ${casket.room}` : ""}`
    : "St. Peter Chapel";
}

/** The scanned QR, if it is a toe tag or casket tag of this service. */
function resolveTag(caseId: string, raw: string): TagDetails | Fail {
  const doc = lookupDoc(raw);
  if (!doc || (doc.kind !== "tag" && doc.kind !== "ck"))
    return {
      ok: false,
      error: "Scan the QR on the toe tag (TAG-…) or the casket tag (CK-…).",
    };
  if (doc.caseId !== caseId)
    return {
      ok: false,
      mismatch: true,
      error:
        "This tag isn't linked to this service. Please ask the chapel staff for assistance before scanning again.",
    };
  return {
    code: doc.code,
    caseId: doc.caseId,
    deceased: doc.deceased ?? "—",
    life: `${longDate(doc.dob)} – ${longDate(doc.dod)}`,
    chapel: chapelOf(doc.caseId),
    retrieved: shortDateTime(doc.departure),
    photoUrl: DEMO_PHOTO,
  };
}

function record(caseId: string): Record<string, string> {
  return confirmations.get(caseId) ?? {};
}

export async function openService(
  token: string,
  lastName: string,
): Promise<{ ok: true; service: ServiceSummary } | Fail> {
  const auth = authorize(token, lastName);
  if ("ok" in auth) return auth;
  const trip = lookupDoc(findTripCode(auth.caseId) ?? "");
  return {
    ok: true,
    service: {
      caseId: auth.caseId,
      deceased: trip?.deceased ?? "",
      confirmedAt: record(auth.caseId).tag ?? "",
    },
  };
}

export async function checkTag(
  token: string,
  lastName: string,
  code: string,
): Promise<{ ok: true; tag: TagDetails } | Fail> {
  const auth = authorize(token, lastName);
  if ("ok" in auth) return auth;
  const tag = resolveTag(auth.caseId, code);
  return "ok" in tag ? tag : { ok: true, tag };
}

export async function confirmTag(
  token: string,
  lastName: string,
  code: string,
): Promise<{ ok: true; confirmedAt: string } | Fail> {
  const auth = authorize(token, lastName);
  if ("ok" in auth) return auth;
  const tag = resolveTag(auth.caseId, code);
  if ("ok" in tag) return tag;
  // A second confirmation keeps the first time: that is the one on record.
  const done = record(auth.caseId);
  const confirmedAt = done.tag ?? stamp();
  confirmations.set(auth.caseId, { ...done, tag: confirmedAt });
  return { ok: true, confirmedAt };
}

/** The service home. Released only once the toe tag has been confirmed. */
export async function getServiceHome(
  token: string,
  lastName: string,
): Promise<{ ok: true; home: ServiceHome } | Fail> {
  const auth = authorize(token, lastName);
  if ("ok" in auth) return auth;
  const caseId = auth.caseId;
  const done = record(caseId);
  if (!done.tag)
    return { ok: false, error: "Confirm the toe tag first to open the service home." };

  const trip = lookupDoc(findTripCode(caseId) ?? "");
  const ticket = lookupDoc(findEmbalmCode(caseId) ?? "");
  const extra = FAMILY_DEMO[caseId];
  const requested = embalmRequestFor(caseId);
  const now = Date.now();
  const sent = uploads.get(caseId) ?? {};

  return {
    ok: true,
    home: {
      caseId,
      deceased: trip?.deceased ?? "—",
      life: `${longDate(trip?.dob)} – ${longDate(trip?.dod)}`,
      chapel: chapelOf(caseId),
      tag: findTagCode(caseId) ?? "—",
      done: done as Partial<Record<StepId, string>>,
      docs: Object.fromEntries(
        Object.entries(sent).map(([id, { file, at }]) => [
          id,
          { file, status: now - at < REVIEW_MS ? "review" : "ok" },
        ]),
      ),
      embalming: {
        embalmer: ticket?.embalmer ?? "—",
        completed: extra?.embalmingCompleted ?? "—",
        casketDesign: trip?.casket ?? "—",
        photoUrl: DEMO_PHOTO,
        // The demo embalmer performed what was asked; real actuals come from
        // the embalming summary once it is stored.
        rows: REQUEST_LABELS.map(([key, label, names]) => {
          const value = names[String(requested[key])] ?? "—";
          return [label, value, value];
        }),
        outcome: extra?.outcome ?? "—",
        remarks: extra?.remarks ?? "—",
      },
      casket: { casketDesign: trip?.casket ?? "—" },
      profile: [
        ["Name", trip?.contact ?? "—"],
        ["Relationship", extra?.relationship ?? "—"],
        ["Mobile", trip?.phone ?? "—"],
        ["Service ID", caseId],
      ],
    },
  };
}

/** The casket barcode scanned before the viewing, checked against the service. */
export async function checkCasket(
  token: string,
  lastName: string,
  code: string,
): Promise<{ ok: true; rows: [string, string][] } | Fail> {
  const auth = authorize(token, lastName);
  if ("ok" in auth) return auth;
  const doc = lookupDoc(code);
  if (!doc || doc.kind !== "ck")
    return { ok: false, error: "Scan the barcode on the casket tag (CK-…)." };
  if (doc.caseId !== auth.caseId)
    return {
      ok: false,
      mismatch: true,
      error:
        "This casket isn't linked to this service. Please ask the chapel staff for assistance.",
    };
  const trip = lookupDoc(findTripCode(auth.caseId) ?? "");
  return {
    ok: true,
    rows: [
      ["Deceased", trip?.deceased ?? "—"],
      ["Casket barcode", doc.code],
      ["Casket design", trip?.casket ?? "—"],
      ["Service ID", auth.caseId],
    ],
  };
}

/**
 * The family's authorization of a later step. Steps go in order, and the
 * casket confirmation needs the casket barcode it was scanned with.
 */
export async function confirmStep(
  token: string,
  lastName: string,
  step: "embalm" | "casket",
  casketCode = "",
): Promise<{ ok: true; confirmedAt: string } | Fail> {
  const auth = authorize(token, lastName);
  if ("ok" in auth) return auth;
  const done = record(auth.caseId);
  const before = step === "embalm" ? "tag" : "embalm";
  if (!done[before])
    return { ok: false, error: "Please complete the earlier step first." };
  if (step === "casket") {
    const doc = lookupDoc(casketCode);
    if (!doc || doc.kind !== "ck" || doc.caseId !== auth.caseId)
      return { ok: false, error: "Scan this service's casket barcode first." };
  }
  const confirmedAt = done[step] ?? stamp();
  confirmations.set(auth.caseId, { ...done, [step]: confirmedAt });
  return { ok: true, confirmedAt };
}

/** Records a required document. The file itself is not kept in the demo. */
export async function submitDocument(
  token: string,
  lastName: string,
  docId: string,
  fileName: string,
): Promise<{ ok: true } | Fail> {
  const auth = authorize(token, lastName);
  if ("ok" in auth) return auth;
  const sent = uploads.get(auth.caseId) ?? {};
  uploads.set(auth.caseId, {
    ...sent,
    [docId]: { file: fileName.slice(0, 120), at: Date.now() },
  });
  return { ok: true };
}

/** Clears this service's family records so the demo can be run again. */
export async function resetDemo(
  token: string,
  lastName: string,
): Promise<{ ok: true } | Fail> {
  if (process.env.NODE_ENV === "production")
    return { ok: false, error: "Not available." };
  const auth = authorize(token, lastName);
  if ("ok" in auth) return auth;
  confirmations.delete(auth.caseId);
  uploads.delete(auth.caseId);
  return { ok: true };
}
