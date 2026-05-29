/**
 * huebrew — brew a usable color palette & theme tokens from any image.
 *
 * Zero dependencies. The core works on raw RGBA pixels, so it runs in the
 * browser (via canvas `ImageData`), in Node (via any decoder you already use),
 * Deno or Bun — and never makes a network call.
 */

import { isLight, rgbToHex, rgbToHsl, textColorFor, type RGB } from "./color.js";
import { quantize, quantizeWithCounts } from "./quantize.js";

export type { RGB } from "./color.js";
export { rgbToHex, hexToRgb, rgbToHsl, ramp, contrast, luminance, textColorFor, RAMP_STOPS } from "./color.js";
export { quantize, quantizeWithCounts } from "./quantize.js";
export * from "./format.js";

export interface Swatch {
  rgb: RGB;
  hex: string;
  hsl: { h: number; s: number; l: number };
  /** Sampled pixel population for this color (higher = more dominant). */
  population: number;
  isLight: boolean;
  /** `"#000000"` or `"#ffffff"` — whichever is readable on this swatch (WCAG). */
  textColor: string;
}

/** An RGBA pixel buffer, or anything `ImageData`-shaped (`{ data, width, height }`). */
export type PixelSource = ArrayLike<number> | { data: ArrayLike<number>; width?: number; height?: number };

export interface PaletteOptions {
  /** How many colors to extract. Default `6`. */
  colors?: number;
  /** Sample every Nth pixel. Default: auto (targets ~20k samples for speed). */
  step?: number;
}

function toPixels(source: PixelSource): ArrayLike<number> {
  if (typeof source === "object" && source !== null && "data" in source) return source.data;
  return source;
}

function autoStep(pixelCount: number): number {
  return Math.max(1, Math.round(Math.sqrt(pixelCount / 20000)));
}

function makeSwatch(rgb: RGB, population: number): Swatch {
  return {
    rgb,
    hex: rgbToHex(rgb),
    hsl: rgbToHsl(rgb),
    population,
    isLight: isLight(rgb),
    textColor: textColorFor(rgb),
  };
}

/**
 * Extract a palette from an image's pixels, most-dominant first.
 *
 * ```ts
 * // Browser
 * const ctx = canvas.getContext("2d")!;
 * const swatches = palette(ctx.getImageData(0, 0, canvas.width, canvas.height), { colors: 6 });
 * swatches[0].hex; // dominant color
 * ```
 */
export function palette(source: PixelSource, options: PaletteOptions = {}): Swatch[] {
  const pixels = toPixels(source);
  const colors = options.colors ?? 6;
  const step = options.step ?? autoStep(pixels.length / 4);
  return quantizeWithCounts(pixels, colors, step).map(({ rgb, population }) =>
    makeSwatch(rgb, population),
  );
}

/** The single most dominant color, or `null` for an empty/transparent image. */
export function dominant(source: PixelSource, options: PaletteOptions = {}): Swatch | null {
  return palette(source, { ...options, colors: Math.max(options.colors ?? 5, 5) })[0] ?? null;
}
