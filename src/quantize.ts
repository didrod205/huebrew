/**
 * Modified Median Cut Quantization (MMCQ) — extract a small, representative
 * palette from a large set of pixels, deterministically and dependency-free.
 *
 * The classic approach: bucket colors into a 3D histogram, then repeatedly
 * split the box containing the most pixels along its longest axis at the
 * population median, prioritizing first by population and then by population×volume.
 */

import type { RGB } from "./color.js";

const SIGBITS = 5;
const RSHIFT = 8 - SIGBITS;
const HISTO_SIZE = 1 << (3 * SIGBITS);
const FRACT_BY_POPULATION = 0.75;
const MAX_ITERATIONS = 1000;

const colorIndex = (r: number, g: number, b: number): number =>
  (r << (2 * SIGBITS)) + (g << SIGBITS) + b;

class VBox {
  constructor(
    public r1: number,
    public r2: number,
    public g1: number,
    public g2: number,
    public b1: number,
    public b2: number,
    public readonly histo: Int32Array,
  ) {}

  private _count = -1;
  private _avg: RGB | null = null;

  volume(): number {
    return (this.r2 - this.r1 + 1) * (this.g2 - this.g1 + 1) * (this.b2 - this.b1 + 1);
  }

  count(): number {
    if (this._count >= 0) return this._count;
    let n = 0;
    for (let r = this.r1; r <= this.r2; r++)
      for (let g = this.g1; g <= this.g2; g++)
        for (let b = this.b1; b <= this.b2; b++) n += this.histo[colorIndex(r, g, b)] as number;
    this._count = n;
    return n;
  }

  average(): RGB {
    if (this._avg) return this._avg;
    let total = 0;
    let rs = 0;
    let gs = 0;
    let bs = 0;
    const mult = 1 << RSHIFT;
    for (let r = this.r1; r <= this.r2; r++)
      for (let g = this.g1; g <= this.g2; g++)
        for (let b = this.b1; b <= this.b2; b++) {
          const h = this.histo[colorIndex(r, g, b)] as number;
          total += h;
          rs += h * (r + 0.5) * mult;
          gs += h * (g + 0.5) * mult;
          bs += h * (b + 0.5) * mult;
        }
    this._avg = total
      ? [Math.round(rs / total), Math.round(gs / total), Math.round(bs / total)]
      : [
          Math.round((mult * (this.r1 + this.r2 + 1)) / 2),
          Math.round((mult * (this.g1 + this.g2 + 1)) / 2),
          Math.round((mult * (this.b1 + this.b2 + 1)) / 2),
        ];
    return this._avg;
  }

  clone(r1: number, r2: number, g1: number, g2: number, b1: number, b2: number): VBox {
    return new VBox(r1, r2, g1, g2, b1, b2, this.histo);
  }
}

function buildHisto(pixels: ArrayLike<number>, step: number): Int32Array {
  const histo = new Int32Array(HISTO_SIZE);
  for (let i = 0; i < pixels.length; i += 4 * step) {
    const a = pixels[i + 3];
    if (a !== undefined && a < 125) continue; // skip mostly-transparent pixels
    const r = (pixels[i] as number) >> RSHIFT;
    const g = (pixels[i + 1] as number) >> RSHIFT;
    const b = (pixels[i + 2] as number) >> RSHIFT;
    const idx = colorIndex(r, g, b);
    histo[idx] = (histo[idx] as number) + 1;
  }
  return histo;
}

function vboxFromHisto(histo: Int32Array): VBox {
  let r1 = 31, r2 = 0, g1 = 31, g2 = 0, b1 = 31, b2 = 0;
  for (let r = 0; r < 32; r++)
    for (let g = 0; g < 32; g++)
      for (let b = 0; b < 32; b++) {
        if ((histo[colorIndex(r, g, b)] as number) > 0) {
          r1 = Math.min(r1, r); r2 = Math.max(r2, r);
          g1 = Math.min(g1, g); g2 = Math.max(g2, g);
          b1 = Math.min(b1, b); b2 = Math.max(b2, b);
        }
      }
  return new VBox(r1, r2, g1, g2, b1, b2, histo);
}

function medianCut(vbox: VBox): [VBox, VBox] | [VBox] {
  const total = vbox.count();
  if (total === 0) return [vbox];

  const rw = vbox.r2 - vbox.r1 + 1;
  const gw = vbox.g2 - vbox.g1 + 1;
  const bw = vbox.b2 - vbox.b1 + 1;
  const axis = Math.max(rw, gw, bw) === rw ? "r" : Math.max(gw, bw) === gw ? "g" : "b";

  const partial: number[] = [];
  let sum = 0;
  const { histo } = vbox;

  const accumulate = (outer1: number, outer2: number) => {
    for (let i = outer1; i <= outer2; i++) {
      let slice = 0;
      if (axis === "r") {
        for (let g = vbox.g1; g <= vbox.g2; g++)
          for (let b = vbox.b1; b <= vbox.b2; b++) slice += histo[colorIndex(i, g, b)] as number;
      } else if (axis === "g") {
        for (let r = vbox.r1; r <= vbox.r2; r++)
          for (let b = vbox.b1; b <= vbox.b2; b++) slice += histo[colorIndex(r, i, b)] as number;
      } else {
        for (let r = vbox.r1; r <= vbox.r2; r++)
          for (let g = vbox.g1; g <= vbox.g2; g++) slice += histo[colorIndex(r, g, i)] as number;
      }
      sum += slice;
      partial[i] = sum;
    }
  };

  const lo = axis === "r" ? vbox.r1 : axis === "g" ? vbox.g1 : vbox.b1;
  const hi = axis === "r" ? vbox.r2 : axis === "g" ? vbox.g2 : vbox.b2;
  accumulate(lo, hi);

  if (lo === hi) return [vbox]; // can't split a single slice

  let splitPoint = lo;
  for (let i = lo; i <= hi; i++) {
    if ((partial[i] as number) > total / 2) {
      splitPoint = Math.max(lo, Math.min(hi - 1, i));
      break;
    }
  }

  const a = vbox.clone(
    vbox.r1, axis === "r" ? splitPoint : vbox.r2,
    vbox.g1, axis === "g" ? splitPoint : vbox.g2,
    vbox.b1, axis === "b" ? splitPoint : vbox.b2,
  );
  const b = vbox.clone(
    axis === "r" ? splitPoint + 1 : vbox.r1, vbox.r2,
    axis === "g" ? splitPoint + 1 : vbox.g1, vbox.g2,
    axis === "b" ? splitPoint + 1 : vbox.b1, vbox.b2,
  );
  return [a, b];
}

function run(pixels: ArrayLike<number>, maxColors: number, step: number): VBox[] {
  const histo = buildHisto(pixels, Math.max(1, step));
  const boxes = [vboxFromHisto(histo)];
  if (boxes[0]!.count() === 0) return [];

  const splitUntil = (target: number, byVolume: boolean) => {
    let iterations = 0;
    while (iterations++ < MAX_ITERATIONS && boxes.length < target) {
      boxes.sort((x, y) =>
        byVolume ? x.count() * x.volume() - y.count() * y.volume() : x.count() - y.count(),
      );
      const biggest = boxes.pop();
      if (!biggest || biggest.count() === 0) {
        if (biggest) boxes.push(biggest);
        break;
      }
      const parts = medianCut(biggest);
      if (parts.length === 1) {
        boxes.push(parts[0]); // unsplittable; leave it and stop trying
        break;
      }
      boxes.push(parts[0], parts[1]);
    }
  };

  splitUntil(Math.max(1, Math.floor(FRACT_BY_POPULATION * maxColors)), false);
  splitUntil(maxColors, true);

  return boxes
    .filter((box) => box.count() > 0)
    .sort((x, y) => y.count() - x.count())
    .slice(0, maxColors);
}

/**
 * Quantize `pixels` (a flat RGBA array) down to at most `maxColors` colors.
 * `step` samples every Nth pixel for speed. Returns RGB triplets ordered by
 * population (most common first).
 */
export function quantize(pixels: ArrayLike<number>, maxColors = 6, step = 1): RGB[] {
  if (maxColors < 1) return [];
  return run(pixels, maxColors, step).map((box) => box.average());
}

/** Like {@link quantize}, but each color carries its pixel population (sampled). */
export function quantizeWithCounts(
  pixels: ArrayLike<number>,
  maxColors = 6,
  step = 1,
): { rgb: RGB; population: number }[] {
  if (maxColors < 1) return [];
  return run(pixels, maxColors, step).map((box) => ({ rgb: box.average(), population: box.count() }));
}
