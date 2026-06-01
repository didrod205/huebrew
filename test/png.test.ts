import { describe, expect, it } from "vitest";
import { deflateSync } from "node:zlib";
import { decodePng, isPng } from "../src/png.js";

// --- PNG builder helpers (real, zlib-compressed PNGs) ---
const SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function u32(n: number): number[] {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
}
function chunk(type: string, data: Uint8Array): number[] {
  const t = [...type].map((c) => c.charCodeAt(0));
  const body = Uint8Array.from([...t, ...data]);
  return [...u32(data.length), ...t, ...data, ...u32(crc32(body))];
}

/** Build an 8-bit PNG of the given color type from RGBA pixels. */
function buildPng(width: number, height: number, rgba: number[], colorType: number): Uint8Array {
  const channels = colorType === 2 ? 3 : colorType === 6 ? 4 : colorType === 0 ? 1 : 2;
  const stride = width * channels;
  const raw = new Uint8Array(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4;
      const dst = y * (stride + 1) + 1 + x * channels;
      if (colorType === 2) {
        raw[dst] = rgba[src]!;
        raw[dst + 1] = rgba[src + 1]!;
        raw[dst + 2] = rgba[src + 2]!;
      } else if (colorType === 6) {
        raw[dst] = rgba[src]!;
        raw[dst + 1] = rgba[src + 1]!;
        raw[dst + 2] = rgba[src + 2]!;
        raw[dst + 3] = rgba[src + 3]!;
      } else if (colorType === 0) {
        raw[dst] = rgba[src]!;
      } else {
        raw[dst] = rgba[src]!;
        raw[dst + 1] = rgba[src + 3]!;
      }
    }
  }
  const idat = new Uint8Array(deflateSync(raw));
  const ihdr = Uint8Array.from([...u32(width), ...u32(height), 8, colorType, 0, 0, 0]);
  return Uint8Array.from([
    ...SIG,
    ...chunk("IHDR", ihdr),
    ...chunk("IDAT", idat),
    ...chunk("IEND", new Uint8Array(0)),
  ]);
}

const px = (img: { data: Uint8Array; width: number }, x: number, y: number): number[] => {
  const o = (y * img.width + x) * 4;
  return [img.data[o]!, img.data[o + 1]!, img.data[o + 2]!, img.data[o + 3]!];
};

describe("isPng", () => {
  it("recognizes the PNG signature", () => {
    expect(isPng(Uint8Array.from(SIG))).toBe(true);
    expect(isPng(Uint8Array.from([1, 2, 3]))).toBe(false);
  });
});

describe("decodePng", () => {
  // 2x1 image: red then blue.
  const rgba = [255, 0, 0, 255, 0, 0, 255, 255];

  it("decodes truecolor (type 2)", () => {
    const img = decodePng(buildPng(2, 1, rgba, 2));
    expect(img.width).toBe(2);
    expect(px(img, 0, 0)).toEqual([255, 0, 0, 255]);
    expect(px(img, 1, 0)).toEqual([0, 0, 255, 255]);
  });

  it("decodes truecolor + alpha (type 6)", () => {
    const semi = [255, 0, 0, 128, 0, 255, 0, 255];
    const img = decodePng(buildPng(2, 1, semi, 6));
    expect(px(img, 0, 0)).toEqual([255, 0, 0, 128]);
    expect(px(img, 1, 0)).toEqual([0, 255, 0, 255]);
  });

  it("decodes grayscale (type 0)", () => {
    const gray = [100, 100, 100, 255, 200, 200, 200, 255];
    const img = decodePng(buildPng(2, 1, gray, 0));
    expect(px(img, 0, 0)).toEqual([100, 100, 100, 255]);
    expect(px(img, 1, 0)).toEqual([200, 200, 200, 255]);
  });

  it("applies scanline filters correctly across rows", () => {
    // A 2x2 gradient exercises the up/left/paeth predictors after deflate.
    const grad = [
      10, 20, 30, 255, 40, 50, 60, 255,
      70, 80, 90, 255, 100, 110, 120, 255,
    ];
    const img = decodePng(buildPng(2, 2, grad, 2));
    expect(px(img, 0, 0)).toEqual([10, 20, 30, 255]);
    expect(px(img, 1, 1)).toEqual([100, 110, 120, 255]);
  });

  it("throws a clear error on non-PNG input", () => {
    expect(() => decodePng(Uint8Array.from([1, 2, 3, 4]))).toThrow(/not a PNG/);
  });
});
