/**
 * Export a palette into developer-ready formats: hex array, CSS variables,
 * SCSS, JSON, an SVG preview strip, and a Tailwind color config (with
 * perceptual ramps).
 */

import { ramp, RAMP_STOPS } from "./color.js";
import type { Swatch } from "./index.js";

const slug = (i: number, prefix: string): string => `${prefix}-${i + 1}`;

/** Just the hex strings, in palette order. */
export function toArray(swatches: Swatch[]): string[] {
  return swatches.map((s) => s.hex);
}

/** `:root { --color-1: #...; ... }` */
export function toCSS(swatches: Swatch[], prefix = "color"): string {
  const lines = swatches.map((s, i) => `  --${slug(i, prefix)}: ${s.hex};`);
  return `:root {\n${lines.join("\n")}\n}`;
}

/** `$color-1: #...;` SCSS variables. */
export function toSCSS(swatches: Swatch[], prefix = "color"): string {
  return swatches.map((s, i) => `$${slug(i, prefix)}: ${s.hex};`).join("\n");
}

/** Pretty JSON of the palette (hex, rgb, hsl, population). */
export function toJSON(swatches: Swatch[]): string {
  return JSON.stringify(
    swatches.map((s) => ({ hex: s.hex, rgb: s.rgb, hsl: s.hsl, population: s.population })),
    null,
    2,
  );
}

/** A standalone SVG strip of swatches — great for READMEs and previews. */
export function toSVG(swatches: Swatch[], options: { size?: number } = {}): string {
  const size = options.size ?? 80;
  const w = size * swatches.length;
  const rects = swatches
    .map((s, i) => {
      const x = i * size;
      const label = s.hex.toUpperCase();
      return (
        `<rect x="${x}" y="0" width="${size}" height="${size}" fill="${s.hex}"/>` +
        `<text x="${x + size / 2}" y="${size - 8}" font-family="monospace" font-size="10" ` +
        `text-anchor="middle" fill="${s.textColor}">${label}</text>`
      );
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${size}" viewBox="0 0 ${w} ${size}">${rects}</svg>`;
}

/**
 * A Tailwind `theme.extend.colors` object. Each swatch becomes a named color
 * with a full 50–950 perceptual ramp (great for dropping into a config).
 *
 * ```ts
 * toTailwind(palette(img), ["brand", "accent"]);
 * // { brand: { 50: "#...", ..., 950: "#..." }, accent: { ... }, ... }
 * ```
 */
export function toTailwind(
  swatches: Swatch[],
  names: string[] = [],
): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  swatches.forEach((s, i) => {
    const name = names[i] ?? `palette-${i + 1}`;
    const stops = ramp(s.rgb);
    const obj: Record<string, string> = {};
    RAMP_STOPS.forEach((stop, j) => {
      obj[stop] = stops[j] as string;
    });
    out[name] = obj;
  });
  return out;
}
