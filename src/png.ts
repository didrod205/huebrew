/**
 * Minimal PNG decoder → RGBA pixels, using only Node's built-in `zlib`.
 *
 * Supports the common cases huebrew needs for palette extraction: 8-bit
 * truecolor (type 2), truecolor+alpha (type 6), grayscale (0), grayscale+alpha
 * (4) and palette/indexed (3), with all five scanline filters. 16-bit samples
 * are down-sampled to 8-bit. Interlaced PNGs are rejected with a clear error.
 *
 * This keeps huebrew dependency-free at runtime — `node:zlib` is part of the
 * standard library, not an npm package.
 */

import { inflateSync } from "node:zlib";

export interface DecodedImage {
  width: number;
  height: number;
  /** RGBA, 4 bytes per pixel, row-major. */
  data: Uint8Array;
}

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export function isPng(b: Uint8Array): boolean {
  return SIGNATURE.every((v, i) => b[i] === v);
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/** Decode a PNG buffer into RGBA pixels. Throws on unsupported variants. */
export function decodePng(buf: Uint8Array): DecodedImage {
  if (!isPng(buf)) throw new Error("not a PNG file");
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idat: Uint8Array[] = [];
  let palette: Uint8Array | null = null;
  let trns: Uint8Array | null = null;

  let pos = 8;
  while (pos + 8 <= buf.length) {
    const len = dv.getUint32(pos);
    const type = String.fromCharCode(buf[pos + 4]!, buf[pos + 5]!, buf[pos + 6]!, buf[pos + 7]!);
    const dataStart = pos + 8;
    if (dataStart + len > buf.length) break;
    if (type === "IHDR") {
      width = dv.getUint32(dataStart);
      height = dv.getUint32(dataStart + 4);
      bitDepth = buf[dataStart + 8]!;
      colorType = buf[dataStart + 9]!;
      interlace = buf[dataStart + 12]!;
    } else if (type === "PLTE") {
      palette = buf.subarray(dataStart, dataStart + len);
    } else if (type === "tRNS") {
      trns = buf.subarray(dataStart, dataStart + len);
    } else if (type === "IDAT") {
      idat.push(buf.subarray(dataStart, dataStart + len));
    } else if (type === "IEND") {
      break;
    }
    pos = dataStart + len + 4; // + CRC
  }

  if (width === 0 || height === 0) throw new Error("invalid PNG: missing IHDR");
  if (interlace !== 0) throw new Error("interlaced PNG is not supported");
  if (bitDepth !== 8 && bitDepth !== 16 && !(colorType === 3 && bitDepth <= 8)) {
    throw new Error(`unsupported PNG bit depth ${bitDepth}`);
  }

  // Concatenate IDAT and inflate.
  const total = idat.reduce((n, c) => n + c.length, 0);
  const compressed = new Uint8Array(total);
  let off = 0;
  for (const c of idat) {
    compressed.set(c, off);
    off += c.length;
  }
  const raw = new Uint8Array(inflateSync(compressed));

  const channels = colorTypeChannels(colorType);
  const sampleBytes = bitDepth === 16 ? 2 : 1;
  const out = new Uint8Array(width * height * 4);

  if (colorType === 3) {
    decodeIndexed(raw, width, height, bitDepth, palette, trns, out);
  } else {
    decodeDirect(raw, width, height, channels, sampleBytes, colorType, trns, out);
  }
  return { width, height, data: out };
}

function colorTypeChannels(colorType: number): number {
  switch (colorType) {
    case 0: return 1; // grayscale
    case 2: return 3; // truecolor
    case 3: return 1; // indexed
    case 4: return 2; // grayscale + alpha
    case 6: return 4; // truecolor + alpha
    default: throw new Error(`unsupported PNG color type ${colorType}`);
  }
}

/** Reverse PNG scanline filters in place, returning the unfiltered row bytes. */
function unfilter(raw: Uint8Array, width: number, height: number, bpp: number): Uint8Array {
  const stride = width * bpp;
  const out = new Uint8Array(height * stride);
  let rawPos = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[rawPos++]!;
    const rowStart = y * stride;
    for (let x = 0; x < stride; x++) {
      const value = raw[rawPos++]!;
      const a = x >= bpp ? out[rowStart + x - bpp]! : 0;
      const b = y > 0 ? out[rowStart - stride + x]! : 0;
      const c = y > 0 && x >= bpp ? out[rowStart - stride + x - bpp]! : 0;
      let v: number;
      switch (filter) {
        case 0: v = value; break;
        case 1: v = value + a; break;
        case 2: v = value + b; break;
        case 3: v = value + ((a + b) >> 1); break;
        case 4: v = value + paeth(a, b, c); break;
        default: throw new Error(`unsupported PNG filter ${filter}`);
      }
      out[rowStart + x] = v & 0xff;
    }
  }
  return out;
}

function decodeDirect(
  raw: Uint8Array,
  width: number,
  height: number,
  channels: number,
  sampleBytes: number,
  colorType: number,
  trns: Uint8Array | null,
  out: Uint8Array,
): void {
  const bpp = channels * sampleBytes;
  const rows = unfilter(raw, width, height, bpp);
  const stride = width * bpp;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const src = y * stride + x * bpp;
      const dst = (y * width + x) * 4;
      // Read each channel's high byte (handles 8- and 16-bit).
      const sample = (ch: number): number => rows[src + ch * sampleBytes]!;
      let r: number, g: number, b: number, a = 255;
      if (colorType === 0 || colorType === 4) {
        r = g = b = sample(0);
        if (colorType === 4) a = sample(1);
      } else {
        r = sample(0);
        g = sample(1);
        b = sample(2);
        if (colorType === 6) a = sample(3);
      }
      out[dst] = r;
      out[dst + 1] = g;
      out[dst + 2] = b;
      out[dst + 3] = a;
    }
    void trns;
  }
}

function decodeIndexed(
  raw: Uint8Array,
  width: number,
  height: number,
  bitDepth: number,
  palette: Uint8Array | null,
  trns: Uint8Array | null,
  out: Uint8Array,
): void {
  if (!palette) throw new Error("indexed PNG missing PLTE");
  // Indexed images store packed indices; unfilter with 1 byte-per-pixel stride
  // computed from the bit depth.
  const stride = Math.ceil((width * bitDepth) / 8);
  const rows = unfilter(raw, stride, height, 1);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = readIndex(rows, y * stride, x, bitDepth);
      const dst = (y * width + x) * 4;
      out[dst] = palette[idx * 3] ?? 0;
      out[dst + 1] = palette[idx * 3 + 1] ?? 0;
      out[dst + 2] = palette[idx * 3 + 2] ?? 0;
      out[dst + 3] = trns && idx < trns.length ? trns[idx]! : 255;
    }
  }
}

function readIndex(rows: Uint8Array, rowStart: number, x: number, bitDepth: number): number {
  if (bitDepth === 8) return rows[rowStart + x]!;
  const perByte = 8 / bitDepth;
  const byte = rows[rowStart + Math.floor(x / perByte)]!;
  const shift = (perByte - 1 - (x % perByte)) * bitDepth;
  const mask = (1 << bitDepth) - 1;
  return (byte >> shift) & mask;
}
