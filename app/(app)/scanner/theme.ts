/**
 * Palette and shared surfaces for the Personnel Scan flow.
 *
 * Each entry is a CSS variable defined in app/globals.css. The light values
 * pin the exact greens of the scan design, which the kit's "green" theme does
 * not resolve to; the dark values are the kit's green dark palette, so the
 * flow sits inside the app shell without a seam. The kit's ColorModeProvider
 * puts `class="dark"` on <html>, and the variables swap there in CSS, so
 * nothing here needs to know the mode.
 */
const v = (name: string) => `var(--scan-${name})`;

export const C = {
  canvas: v("canvas"),
  surface: v("surface"),
  /** Text and glyphs on a green or red fill — white in both modes. */
  onFill: "#ffffff",

  ink: v("ink"),
  inkSoft: v("ink-soft"),
  muted: v("muted"),
  sage: v("sage"),
  faint: v("faint"),
  fainter: v("fainter"),

  line: v("line"),
  lineSoft: v("line-soft"),
  lineFaint: v("line-faint"),
  field: v("field"),

  tint: v("tint"),
  tintLine: v("tint-line"),
  tintBg: v("tint-bg"),
  tintBorder: v("tint-border"),
  mint: v("mint"),

  green: v("green"),
  greenBright: v("green-bright"),
  greenDeep: v("green-deep"),
  greenDeeper: v("green-deeper"),

  red: v("red"),
  redText: v("red-text"),
  redInk: v("red-ink"),
  redBg: v("red-bg"),
  redLine: v("red-line"),

  amberBg: v("amber-bg"),
  amberLine: v("amber-line"),
  amberInk: v("amber-ink"),
  amberIcon: v("amber-icon"),
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
