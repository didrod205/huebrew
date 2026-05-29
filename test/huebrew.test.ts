import { describe, expect, it } from "vitest";
import {
  contrast,
  dominant,
  hexToRgb,
  luminance,
  palette,
  ramp,
  rgbToHex,
  textColorFor,
  toArray,
  toCSS,
  toJSON,
  toSVG,
  toTailwind,
  type RGB,
} from "../src/index.js";

/** Build an RGBA pixel buffer from [color, count] pairs. */
function buf(parts: Array<[RGB, number]>): Uint8ClampedArray {
  const total = parts.reduce((n, [, c]) => n + c, 0);
  const arr = new Uint8ClampedArray(total * 4);
  let i = 0;
  for (const [[r, g, b], count] of parts) {
    for (let k = 0; k < count; k++) {
      arr[i++] = r;
      arr[i++] = g;
      arr[i++] = b;
      arr[i++] = 255;
    }
  }
  return arr;
}

const reddish = (rgb: RGB) => rgb[0] > 200 && rgb[1] < 40 && rgb[2] < 40;
const bluish = (rgb: RGB) => rgb[2] > 200 && rgb[0] < 40 && rgb[1] < 40;

describe("palette", () => {
  it("extracts the dominant colors of an image, most-common first", () => {
    const img = buf([
      [[255, 0, 0], 1000],
      [[0, 0, 255], 200],
    ]);
    const pal = palette(img, { colors: 2, step: 1 });
    expect(pal).toHaveLength(2);
    expect(reddish(pal[0]!.rgb)).toBe(true);
    expect(pal.some((s) => bluish(s.rgb))).toBe(true);
    expect(pal[0]!.population).toBeGreaterThanOrEqual(pal[1]!.population);
  });

  it("accepts ImageData-shaped input", () => {
    const data = buf([[[10, 200, 60], 500]]);
    const pal = palette({ data, width: 1, height: 500 }, { colors: 3 });
    expect(pal.length).toBeGreaterThanOrEqual(1);
    expect(pal[0]!.rgb[1]).toBeGreaterThan(pal[0]!.rgb[0]); // greenish
  });

  it("populates swatch metadata", () => {
    const pal = palette(buf([[[255, 255, 255], 100]]), { colors: 1 });
    const s = pal[0]!;
    expect(s.hex).toMatch(/^#[0-9a-f]{6}$/);
    expect(s.isLight).toBe(true);
    expect(s.textColor).toBe("#000000");
    expect(s.hsl).toHaveProperty("h");
  });

  it("returns an empty palette for a fully transparent image", () => {
    const arr = new Uint8ClampedArray(40 * 4); // all zero incl. alpha
    expect(palette(arr)).toEqual([]);
  });

  it("dominant() returns the single top color", () => {
    const d = dominant(buf([[[200, 20, 20], 900], [[20, 20, 200], 100]]));
    expect(d).not.toBeNull();
    expect(reddish(d!.rgb)).toBe(true);
  });
});

describe("color utilities", () => {
  it("round-trips hex and rgb", () => {
    expect(rgbToHex([255, 0, 0])).toBe("#ff0000");
    expect(hexToRgb("#ff0000")).toEqual([255, 0, 0]);
    expect(hexToRgb("#f00")).toEqual([255, 0, 0]);
  });

  it("computes WCAG contrast and readable text color", () => {
    expect(contrast([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5);
    expect(textColorFor([255, 255, 255])).toBe("#000000");
    expect(textColorFor([0, 0, 0])).toBe("#ffffff");
  });

  it("builds a perceptually-decreasing lightness ramp", () => {
    const r = ramp([52, 152, 219]);
    expect(r).toHaveLength(11);
    for (let i = 1; i < r.length; i++) {
      expect(luminance(hexToRgb(r[i - 1]!))).toBeGreaterThan(luminance(hexToRgb(r[i]!)));
    }
  });
});

describe("exports", () => {
  const pal = palette(buf([[[52, 152, 219], 600], [[231, 76, 60], 300]]), { colors: 2 });

  it("toArray returns hex strings", () => {
    expect(toArray(pal).every((h) => /^#[0-9a-f]{6}$/.test(h))).toBe(true);
  });

  it("toCSS emits custom properties", () => {
    const css = toCSS(pal);
    expect(css).toContain(":root {");
    expect(css).toContain("--color-1:");
  });

  it("toJSON is valid JSON with hex + rgb", () => {
    const parsed = JSON.parse(toJSON(pal));
    expect(parsed[0]).toHaveProperty("hex");
    expect(parsed[0]).toHaveProperty("rgb");
  });

  it("toSVG produces an <svg> string", () => {
    expect(toSVG(pal)).toMatch(/^<svg /);
  });

  it("toTailwind produces named ramps with all stops", () => {
    const tw = toTailwind(pal, ["brand"]);
    expect(tw).toHaveProperty("brand");
    expect(Object.keys(tw.brand!)).toHaveLength(11);
    expect(tw.brand!["500"]).toMatch(/^#[0-9a-f]{6}$/);
  });
});
