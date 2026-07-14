export const NAVY = "#22335E";
export const NAVY_DARK = "#1B2949";
export const GOLD = "#F5B301";
// Same brand navy in light mode, but a lighter legible blue in dark mode —
// use this (not NAVY) for navy TEXT/borders sitting on a themed page/card
// surface. Keep using NAVY for actual navy background fills (header bar,
// solid buttons), which should stay literal navy in both themes.
export const ACCENT = "var(--accent)";
export const BG = "var(--page-bg)";
export const TEXT = "var(--text)";
export const MUTED = "var(--text-muted)";
export const FAINT = "var(--text-faint)";
export const BORDER = "var(--card-border)";
export const INPUT_BORDER = "var(--input-border)";
export const SUBTLE_BG = "var(--subtle-bg)";
export const CHIP_BG = "var(--chip-bg)";

export const GREEN = "oklch(0.55 0.13 155)";
export const GREEN_BG = "oklch(0.93 0.05 155)";
export const GREEN_TX = "oklch(0.4 0.1 155)";
export const AMBER = "oklch(0.62 0.14 75)";
export const AMBER_BG = "oklch(0.95 0.05 90)";
export const AMBER_TX = "oklch(0.5 0.1 75)";
export const RED = "oklch(0.58 0.16 25)";
export const RED_TX = "#B3261E";

export function levelColor(level) {
  return level === "Independent" ? GREEN : level === "Instructional" ? AMBER : RED;
}

export const MISCUE_TYPES = [
  { key: "mis", label: "Mispronunciation", fil: "(Maling Bigkas)", color: "oklch(0.62 0.15 25)" },
  { key: "om", label: "Omission", fil: "(Pagkakaltas)", color: "oklch(0.66 0.14 60)" },
  { key: "sub", label: "Substitution", fil: "(Pagpapalit)", color: "oklch(0.6 0.13 160)" },
  { key: "ins", label: "Insertion", fil: "(Pagsisingit)", color: "oklch(0.6 0.13 210)" },
  { key: "rep", label: "Repetition", fil: "(Pag-uulit)", color: "oklch(0.62 0.13 110)" },
  { key: "tra", label: "Transposition", fil: "(Pagpapalit ng lugar)", color: "oklch(0.6 0.15 310)" },
  { key: "rev", label: "Reversal", fil: "(Paglilipat)", color: "oklch(0.58 0.14 260)" }
];

export const statusMeta = {
  "turned-in": { label: "Turned in", bg: GREEN_BG, color: GREEN_TX },
  "in-progress": { label: "In progress", bg: AMBER_BG, color: AMBER_TX },
  "not-started": { label: "Not started", bg: CHIP_BG, color: FAINT }
};
