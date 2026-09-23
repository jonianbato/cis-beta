export type EmbalmingStatus =
  | "For Creation of Ticket"
  | "In Progress"
  | "For Verification"
  | "Ready For Viewing"
  | "For Rework";

export type HandPosition = "side" | "stomach";
export type ClothesDisposition = "surrender_to_family" | "proper_disposal";
export type EmbalmingOutcome = "normal" | "with_complications";

export interface EmbalmingRecord {
  id: string;
  status: EmbalmingStatus;
  createdAt: string;

  // Request fields
  deceasedName: string;
  dateOfDeath: string;
  timeOfDeath: string;
  age: number;
  placeOfDeath: string;
  handPosition: HandPosition;
  shaveFacialHair: boolean;
  trimNails: boolean;
  hairDye: boolean;
  clothesDisposition: ClothesDisposition;
  forAutopsy: boolean;
  autopsyDate: string | null;
  medicoLegal: string | null;
  specialInstructions: string | null;

  // Initial Start fields
  assignedEmbalmer: string | null;
  assistant: string | null;
  casketBarcode: string | null;
  notesToEmbalmer: string | null;
  startedAt: string | null;

  // Actual values (post-embalming)
  actual_handPosition: HandPosition | null;
  actual_shaveFacialHair: boolean | null;
  actual_trimNails: boolean | null;
  actual_hairDye: boolean | null;
  actual_clothesDisposition: ClothesDisposition | null;
  deviationNotes: string | null;
  embalmingOutcome: EmbalmingOutcome | null;
  chemicalsUsed: string | null;
  remarks: string | null;
  completedAt: string | null;

  // Verification
  verifiedBy: string | null;
  verificationResult: "pass" | "fail" | null;
  verificationRemarks: string | null;
  verifiedAt: string | null;
}

export const embalmers = [
  {
    id: "emb-01",
    name: "Ricardo Santos",
    license: "EMB-2019-00231",
    employmentType: "Regular",
    caseload: 1,
    maxCases: 3,
  },
  {
    id: "emb-02",
    name: "Miguel Garcia",
    license: "EMB-2020-00874",
    employmentType: "Regular",
    caseload: 2,
    maxCases: 3,
  },
  {
    id: "emb-03",
    name: "Jose Reyes",
    license: "EMB-2021-00459",
    employmentType: "Part-time",
    caseload: 0,
    maxCases: 3,
  },
  {
    id: "emb-04",
    name: "Antonio Cruz",
    license: "EMB-2018-00126",
    employmentType: "Regular",
    caseload: 1,
    maxCases: 3,
  },
  {
    id: "emb-05",
    name: "Chapel Personnel (Outsourced)",
    license: null as string | null,
    employmentType: "Part-time",
    caseload: 0,
    maxCases: 3,
  },
];

export const embalmingData: EmbalmingRecord[] = [
  // Stage 1: For Creation of Ticket
  {
    id: "EMB-20260622-001",
    status: "For Creation of Ticket",
    createdAt: "2026-06-22 07:30",
    deceasedName: "Roberto Santos",
    dateOfDeath: "2026-06-21",
    timeOfDeath: "09:00 PM",
    age: 65,
    placeOfDeath: "Philippine General Hospital",
    handPosition: "side",
    shaveFacialHair: true,
    trimNails: true,
    hairDye: false,
    clothesDisposition: "proper_disposal",
    forAutopsy: false,
    autopsyDate: null,
    medicoLegal: null,
    specialInstructions: null,
    assignedEmbalmer: null,
    assistant: null,
    casketBarcode: null,
    notesToEmbalmer: null,
    startedAt: null,
    actual_handPosition: null,
    actual_shaveFacialHair: null,
    actual_trimNails: null,
    actual_hairDye: null,
    actual_clothesDisposition: null,
    deviationNotes: null,
    embalmingOutcome: null,
    chemicalsUsed: null,
    remarks: null,
    completedAt: null,
    verifiedBy: null,
    verificationResult: null,
    verificationRemarks: null,
    verifiedAt: null,
  },
  // Stage 2: In Progress
  {
    id: "EMB-20260622-002",
    status: "In Progress",
    createdAt: "2026-06-21 08:15",
    deceasedName: "Maricel Navarro",
    dateOfDeath: "2026-06-20",
    timeOfDeath: "11:20 AM",
    age: 58,
    placeOfDeath: "Makati Medical Center",
    handPosition: "stomach",
    shaveFacialHair: false,
    trimNails: true,
    hairDye: true,
    clothesDisposition: "surrender_to_family",
    forAutopsy: false,
    autopsyDate: null,
    medicoLegal: null,
    specialInstructions: "Family requests natural look, light cosmetics only",
    assignedEmbalmer: "Miguel Garcia",
    assistant: null,
    casketBarcode: "CSK-00467",
    notesToEmbalmer: "Light cosmetics per family request",
    startedAt: "2026-06-21 09:00",
    actual_handPosition: null,
    actual_shaveFacialHair: null,
    actual_trimNails: null,
    actual_hairDye: null,
    actual_clothesDisposition: null,
    deviationNotes: null,
    embalmingOutcome: null,
    chemicalsUsed: null,
    remarks: null,
    completedAt: null,
    verifiedBy: null,
    verificationResult: null,
    verificationRemarks: null,
    verifiedAt: null,
  },
  // Stage 3: For Verification
  {
    id: "EMB-20260622-003",
    status: "For Verification",
    createdAt: "2026-06-21 14:00",
    deceasedName: "Pedro Castillo",
    dateOfDeath: "2026-06-20",
    timeOfDeath: "02:30 PM",
    age: 80,
    placeOfDeath: "Chong Hua Hospital, Cebu",
    handPosition: "side",
    shaveFacialHair: true,
    trimNails: true,
    hairDye: true,
    clothesDisposition: "surrender_to_family",
    forAutopsy: false,
    autopsyDate: null,
    medicoLegal: null,
    specialInstructions: "Family wants dark brown hair dye",
    assignedEmbalmer: "Jose Reyes",
    assistant: null,
    casketBarcode: "CSK-00472",
    notesToEmbalmer: "Hair dye: dark brown per family",
    startedAt: "2026-06-21 15:00",
    actual_handPosition: "side",
    actual_shaveFacialHair: true,
    actual_trimNails: true,
    actual_hairDye: true,
    actual_clothesDisposition: "surrender_to_family",
    deviationNotes: null,
    embalmingOutcome: "normal",
    chemicalsUsed: "Standard Set B",
    remarks: "Hair dye applied as requested — dark brown.",
    completedAt: "2026-06-21 18:45",
    verifiedBy: null,
    verificationResult: null,
    verificationRemarks: null,
    verifiedAt: null,
  },
  // Stage 4: Ready For Viewing
  {
    id: "EMB-20260622-004",
    status: "Ready For Viewing",
    createdAt: "2026-06-20 09:00",
    deceasedName: "Juan Dela Cruz",
    dateOfDeath: "2026-06-19",
    timeOfDeath: "03:45 PM",
    age: 72,
    placeOfDeath: "Manila Doctors Hospital",
    handPosition: "side",
    shaveFacialHair: true,
    trimNails: true,
    hairDye: false,
    clothesDisposition: "surrender_to_family",
    forAutopsy: true,
    autopsyDate: "2026-06-19",
    medicoLegal: "PNP Crime Lab, QC",
    specialInstructions: null,
    assignedEmbalmer: "Ricardo Santos",
    assistant: "Antonio Cruz",
    casketBarcode: "CSK-00451",
    notesToEmbalmer: "Autopsy case, handle with care",
    startedAt: "2026-06-20 10:30",
    actual_handPosition: "stomach",
    actual_shaveFacialHair: true,
    actual_trimNails: true,
    actual_hairDye: false,
    actual_clothesDisposition: "surrender_to_family",
    deviationNotes:
      "Hand position changed to stomach — autopsy incision made side position unsuitable.",
    embalmingOutcome: "normal",
    chemicalsUsed: "Standard Set A",
    remarks: null,
    completedAt: "2026-06-20 14:12",
    verifiedBy: "Supervisor M. Lim",
    verificationResult: "pass",
    verificationRemarks: "Presentation acceptable. Deviation justified.",
    verifiedAt: "2026-06-20 15:00",
  },
  // Special: For Rework
  {
    id: "EMB-20260622-005",
    status: "For Rework",
    createdAt: "2026-06-21 10:00",
    deceasedName: "Rosa Josefa",
    dateOfDeath: "2026-06-20",
    timeOfDeath: "05:00 AM",
    age: 68,
    placeOfDeath: "Cardinal Santos Medical Center",
    handPosition: "side",
    shaveFacialHair: false,
    trimNails: true,
    hairDye: false,
    clothesDisposition: "proper_disposal",
    forAutopsy: false,
    autopsyDate: null,
    medicoLegal: null,
    specialInstructions: null,
    assignedEmbalmer: "Miguel Garcia",
    assistant: null,
    casketBarcode: "CSK-00463",
    notesToEmbalmer: null,
    startedAt: "2026-06-21 11:00",
    actual_handPosition: "side",
    actual_shaveFacialHair: false,
    actual_trimNails: true,
    actual_hairDye: false,
    actual_clothesDisposition: "proper_disposal",
    deviationNotes: null,
    embalmingOutcome: "with_complications",
    chemicalsUsed: "Standard Set A",
    remarks: "Minor discoloration noted on left hand",
    completedAt: "2026-06-21 14:00",
    verifiedBy: "Supervisor M. Lim",
    verificationResult: "fail",
    verificationRemarks:
      "Visible discoloration on left hand — needs cosmetic correction.",
    verifiedAt: "2026-06-21 14:30",
  },
];

export const statusColorMap: Record<EmbalmingStatus, string> = {
  "For Creation of Ticket": "orange",
  "In Progress": "purple",
  "For Verification": "green",
  "Ready For Viewing": "cyan",
  "For Rework": "red",
};

export const getEmbalmingStatusColor = (status: string) =>
  statusColorMap[status as EmbalmingStatus] ?? "#6b7280";
