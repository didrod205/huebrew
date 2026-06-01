#!/usr/bin/env node
/**
 * huebrew CLI — brew a color palette from a PNG image, zero-dependency.
 *
 *   huebrew photo.png                    # print the palette (swatches + hex)
 *   huebrew photo.png -n 8               # 8 colors
 *   huebrew photo.png --css              # CSS variables
 *   huebrew photo.png --tailwind         # Tailwind color config (OKLab ramps)
 *   huebrew photo.png --svg palette.svg  # write an SVG strip
 *
 * Only PNG is decoded natively (via Node's built-in zlib — still no deps). For
 * other formats, decode to RGBA yourself and use the library API.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { decodePng } from "./png.js";
import { palette, type Swatch } from "./index.js";
import { toArray, toCSS, toSCSS, toJSON, toSVG, toTailwind } from "./format.js";
import pkg from "../package.json";

interface Options {
  file: string | null;
  colors: number;
  format: "swatches" | "hex" | "css" | "scss" | "json" | "svg" | "tailwind";
  out: string | null;
  names: string[];
  noColor: boolean;
}

function parseArgs(argv: string[]): Options {
  const o: Options = {
    file: null,
    colors: 6,
    format: "swatches",
    out: null,
    names: [],
    noColor: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "-n" || a === "--colors") o.colors = Math.max(1, Number(argv[++i]) || 6);
    else if (a === "--hex") o.format = "hex";
    else if (a === "--css") o.format = "css";
    else if (a === "--scss") o.format = "scss";
    else if (a === "--json") o.format = "json";
    else if (a === "--tailwind") o.format = "tailwind";
    else if (a === "--svg") {
      o.format = "svg";
      const next = argv[i + 1];
      if (next && !next.startsWith("-")) o.out = argv[++i]!;
    } else if (a === "-o" || a === "--out") o.out = argv[++i] ?? null;
    else if (a === "--names") o.names = (argv[++i] ?? "").split(",").map((s) => s.trim());
    else if (a === "--no-color") o.noColor = true;
    else if (!a.startsWith("-")) o.file = a;
  }
  return o;
}

/** Print a swatch as a colored block using a truecolor ANSI background. */
function block(s: Swatch, useColor: boolean): string {
  const [r, g, b] = s.rgb;
  const swatch = useColor ? `\x1b[48;2;${r};${g};${b}m    \x1b[0m` : "  ██";
  const pct = "";
  return `${swatch}  ${s.hex.toUpperCase()}  ${pad(`hsl(${s.hsl.h}, ${s.hsl.s}%, ${s.hsl.l}%)`, 22)}${pct}`;
}

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

const HELP = `huebrew — brew a color palette from an image (PNG), 100% locally.

Usage:
  huebrew <image.png> [options]

Options:
  -n, --colors <n>    Number of colors to extract (default 6)
      --hex           Output a plain hex list
      --css           Output CSS custom properties (:root { --color-1: … })
      --scss          Output SCSS variables
      --json          Output JSON (hex, rgb, hsl, population)
      --tailwind      Output a Tailwind colors config with OKLab 50–950 ramps
      --svg [file]    Output an SVG swatch strip (to stdout or a file)
      --names a,b,c   Names for --tailwind colors
  -o, --out <file>    Write output to a file instead of stdout
      --no-color      Disable ANSI color in the swatch view
  -h, --help          Show this help
  -v, --version       Show version

Only PNG is decoded natively (zero dependencies). For JPEG/WebP, decode to RGBA
and use the library API. Nothing is uploaded — all processing is local.`;

function render(swatches: Swatch[], o: Options): string {
  switch (o.format) {
    case "hex": return toArray(swatches).join("\n");
    case "css": return toCSS(swatches);
    case "scss": return toSCSS(swatches);
    case "json": return toJSON(swatches);
    case "svg": return toSVG(swatches);
    case "tailwind": {
      const config = toTailwind(swatches, o.names);
      return `// tailwind.config — theme.extend.colors\n${JSON.stringify(config, null, 2)}`;
    }
    default: {
      const useColor = !o.noColor && process.stdout.isTTY === true;
      const lines = swatches.map((s) => block(s, useColor));
      return lines.join("\n");
    }
  }
}

function main(): number {
  const argv = process.argv.slice(2);
  if (argv.includes("-h") || argv.includes("--help")) {
    process.stdout.write(HELP + "\n");
    return 0;
  }
  if (argv.includes("-v") || argv.includes("--version")) {
    process.stdout.write(`huebrew ${pkg.version}\n`);
    return 0;
  }

  const o = parseArgs(argv);
  if (!o.file) {
    process.stderr.write("huebrew: provide a PNG image. See `huebrew --help`.\n");
    return 2;
  }

  let bytes: Uint8Array;
  try {
    bytes = readFileSync(o.file);
  } catch {
    process.stderr.write(`huebrew: cannot read ${o.file}\n`);
    return 2;
  }

  let image;
  try {
    image = decodePng(bytes);
  } catch (e) {
    process.stderr.write(`huebrew: ${(e as Error).message}\n`);
    if (!/not a PNG/.test((e as Error).message)) {
      process.stderr.write("huebrew: only PNG is supported by the CLI today.\n");
    }
    return 2;
  }

  const swatches = palette(image, { colors: o.colors });
  if (swatches.length === 0) {
    process.stderr.write("huebrew: no colors found (empty or fully transparent image).\n");
    return 1;
  }

  const output = render(swatches, o);
  if (o.out) {
    writeFileSync(o.out, output.endsWith("\n") ? output : output + "\n");
    process.stderr.write(`✓ wrote ${o.out}\n`);
  } else {
    process.stdout.write(output + "\n");
  }
  return 0;
}

process.exit(main());
