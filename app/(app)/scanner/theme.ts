/**
 * Palette and shared surfaces for the Personnel Scan flow.
 *
 * These are literal colours rather than kit tokens on purpose: the design is
 * light-only and pins exact greens that the "green" theme does not resolve to.
 * Everything visual in the flow reads from here, so pointing these at semantic
 * tokens is the one change needed to make the screens follow the colour mode.
 */
export const C = {
  canvas: "#f2f6f3",
  surface: "#ffffff",

  ink: "#0f2c1c",
  inkSoft: "#3a4a41",
  muted: "#5b6b62",
  sage: "#6b8f7a",
  faint: "#8a9a90",
  fainter: "#a6b3ac",

  line: "#e7ede9",
  lineSoft: "#eef2ef",
  lineFaint: "#f4f6f5",
  field: "#dfe7e2",

  tint: "#eef8f2",
  tintLine: "#d2ead9",
  tintBg: "#f8fbf9",
  tintBorder: "#e0efe6",
  mint: "#cfe8d9",

  green: "#16a34a",
  greenBright: "#22c55e",
  greenDeep: "#0f7a37",
  greenDeeper: "#0f5c2e",

  red: "#dc2626",
  redText: "#c62828",
  redInk: "#993229",
  redBg: "#fdf2f1",
  redLine: "#f2dcd9",

  amberBg: "#fdf8ec",
  amberLine: "#f2e3bc",
  amberInk: "#6b4e0c",
  amberIcon: "#8a6410",
} as const;

/** The hairline-bordered panel every grouped block in the flow sits on. */
export const panel = {
  border: "1px solid",
  borderColor: C.line,
  borderRadius: "14px",
} as const;

/** Text input, select and time field — one shared 44px control. */
export const field = {
  w: "full",
  h: "44px",
  px: "12px",
  fontSize: "14px",
  fontWeight: 600,
  color: C.ink,
  border: "1.5px solid",
  borderColor: C.field,
  borderRadius: "10px",
  outline: "none",
  bg: C.surface,
  fontFamily: "inherit",
  _focusVisible: { borderColor: C.green },
} as const;

/** The small grey label that sits above a field or beside a value. */
export const fieldLabel = {
  fontSize: "11.5px",
  fontWeight: 700,
  color: C.faint,
  mb: "6px",
} as const;

export const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
