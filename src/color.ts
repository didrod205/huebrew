/**
 * Color math for huebrew: hex/rgb/hsl conversion, WCAG luminance, and an
 * OKLab-based lightness ramp (perceptually even tints/shades).
 */

export type RGB = [number, number, number];

const clamp = (n: number, lo: number, hi: number): number => (n < lo ? lo : n > hi ? hi : n);

export function rgbToHex([r, g, b]: RGB): string {
  const h = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

export function hexToRgb(hex: string): RGB {
  let h = hex.replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHsl([r, g, b]: RGB): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: Math.round(h * 60), s: Math.round(s * 100), l: Math.round(l * 100) };
}

const srgbToLinear = (c: number): number =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
const linearToSrgb = (c: number): number =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;

/** WCAG relative luminance (0–1). */
export function luminance([r, g, b]: RGB): number {
  return 0.2126 * srgbToLinear(r / 255) + 0.7152 * srgbToLinear(g / 255) + 0.0722 * srgbToLinear(b / 255);
}

/** WCAG contrast ratio between two colors (1–21). */
export function contrast(a: RGB, b: RGB): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Black or white — whichever is more readable on `bg`. */
export function textColorFor(bg: RGB): "#000000" | "#ffffff" {
  return luminance(bg) >= 0.179 ? "#000000" : "#ffffff";
}

export const isLight = (rgb: RGB): boolean => luminance(rgb) >= 0.179;

// --- OKLab ---
interface OKLab {
  L: number;
  a: number;
  b: number;
}

function rgbToOklab([r, g, b]: RGB): OKLab {
  const lr = srgbToLinear(r / 255);
  const lg = srgbToLinear(g / 255);
  const lb = srgbToLinear(b / 255);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

function oklabToRgb({ L, a, b }: OKLab): RGB {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lr = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return [
    clamp(linearToSrgb(lr), 0, 1) * 255,
    clamp(linearToSrgb(lg), 0, 1) * 255,
    clamp(linearToSrgb(lb), 0, 1) * 255,
  ];
}

/** Tailwind-style ramp stops and their target OKLab lightness. */
export const RAMP_STOPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
const RAMP_L = [0.971, 0.936, 0.885, 0.808, 0.704, 0.602, 0.515, 0.43, 0.366, 0.317, 0.235];

/**
 * Generate a perceptually-even tint/shade ramp from a base color by holding its
 * OKLab hue & chroma and walking lightness through Tailwind-like stops.
 * Returns hex strings, light → dark, one per {@link RAMP_STOPS} entry.
 */
export function ramp(base: RGB): string[] {
  const { a, b } = rgbToOklab(base);
  return RAMP_L.map((L) => rgbToHex(oklabToRgb({ L, a, b })));
}
