<div align="center">

# 🎨 huebrew

### Brew a color palette — and a ready-to-use theme — from any image.

[![npm version](https://img.shields.io/npm/v/huebrew.svg?color=success)](https://www.npmjs.com/package/huebrew)
[![bundle size](https://img.shields.io/bundlephobia/minzip/huebrew?label=gzip)](https://bundlephobia.com/package/huebrew)
[![CI](https://github.com/didrod205/huebrew/actions/workflows/ci.yml/badge.svg)](https://github.com/didrod205/huebrew/actions/workflows/ci.yml)
[![types](https://img.shields.io/npm/types/huebrew.svg)](https://www.npmjs.com/package/huebrew)
[![license](https://img.shields.io/npm/l/huebrew.svg)](./LICENSE)

**[🌐 Try the free web studio →](https://didrod205.github.io/huebrew/)** &nbsp;·&nbsp; drop an image, copy your theme. Nothing uploaded.

</div>

---

You found the perfect screenshot, photo, logo, or moodboard — now you need its
colors *in your code*. Today that means eyedropper-ing pixels one at a time, or
pasting your image into some website that wants your email.

**huebrew** extracts the real dominant colors from any image (deterministic
median-cut quantization — not an AI guess), builds **perceptually-even tint/shade
ramps** in OKLab, and hands you a theme you can paste straight in: **CSS
variables, Tailwind colors, SCSS, JSON, or an SVG strip.** All locally, with
**zero dependencies** and **no API key**.

> 📸 _Screenshot / demo GIF:_ `./web/screenshot.png` — record the [live studio](https://didrod205.github.io/huebrew/) dropping an image and copying a Tailwind config.

## Why it exists

- **AI can't do this reliably.** Ask a chatbot for "the colors in this image" and
  it hallucinates hex codes. Exact dominant-color extraction is a precise,
  pixel-level algorithm — perfect for a tiny, deterministic library.
- **Privacy.** Every "extract palette" site makes you upload your image. huebrew
  never sends a byte anywhere.
- **It's a theme, not just colors.** Color Thief gives you 6 swatches. huebrew
  gives you 50→950 ramps and copy-paste configs for the tools you actually use.

## Who it's for

**Designers** (palette from a moodboard), **developers** (theme from a mockup or
screenshot), **marketers** (brand colors from a logo), **content creators**
(match graphics to a photo), and anyone who's ever needed "those colors, as code."

## Install

**No install —** just open the **[web studio](https://didrod205.github.io/huebrew/)**.

For the library:

```bash
npm install huebrew
```

Zero dependencies. Ships ESM + CJS + TypeScript types. Works in the browser, Node, Deno and Bun.

## Usage

### In the browser (canvas)

```ts
import { palette, toTailwind, toCSS } from "huebrew";

const ctx = canvas.getContext("2d")!;
const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

const swatches = palette(imageData, { colors: 6 });
swatches[0].hex;        // dominant color, e.g. "#0f4c81"
swatches[0].textColor;  // "#ffffff" — readable text on it (WCAG)

toCSS(swatches);                       // ":root { --color-1: #0f4c81; ... }"
toTailwind(swatches, ["brand"]);       // { brand: { 50: "#...", ..., 950: "#..." } }
```

### In Node (with any decoder you already have)

```ts
import sharp from "sharp";
import { palette } from "huebrew";

const { data, info } = await sharp("logo.png")
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const swatches = palette({ data, width: info.width, height: info.height }, { colors: 5 });
```

huebrew itself decodes nothing and depends on nothing — it works on raw RGBA
pixels, so you bring whatever decoder fits your environment (or just use a
`<canvas>` in the browser).

### Build a ramp from one color

```ts
import { ramp } from "huebrew";

ramp([15, 76, 129]); // ["#eaf2fb", ... 11 perceptual stops ..., "#08233d"]
```

### Export formats

`toArray`, `toCSS`, `toSCSS`, `toJSON`, `toSVG`, and `toTailwind` — pick the one
that matches your stack.

## API

| Member | Description |
| ------ | ----------- |
| `palette(source, { colors?, step? })` | Extract swatches (most dominant first). `source` = RGBA array or `ImageData`. |
| `dominant(source, options?)` | The single most dominant `Swatch`. |
| `quantize(pixels, maxColors, step?)` | Low-level median-cut → `RGB[]`. |
| `ramp(rgb)` | 11-stop perceptual (OKLab) tint/shade ramp → `string[]`. |
| `rgbToHex` / `hexToRgb` / `rgbToHsl` / `luminance` / `contrast` / `textColorFor` | Color helpers. |
| `toArray` / `toCSS` / `toSCSS` / `toJSON` / `toSVG` / `toTailwind` | Exporters. |

A `Swatch` is `{ rgb, hex, hsl, population, isLight, textColor }`.

## FAQ

**Is my image uploaded anywhere?**
No. Everything runs on your device — web studio and library alike. No server, no
network request, works offline.

**How is this different from Color Thief?**
Color Thief extracts swatches (and pulls in canvas/node-canvas). huebrew is
dependency-free, works on raw pixels in any runtime, **and** turns the palette
into a usable theme — OKLab ramps plus CSS/SCSS/Tailwind/JSON/SVG exporters — via
a polished local web app.

**Why are the colors slightly different from the original pixels?**
Median-cut groups similar colors and returns each group's average, so a swatch is
the *representative* of a region, not necessarily an exact source pixel. Lower
`colors` = broader groups; higher = finer.

**Does it work on photos, screenshots, logos, SVGs?**
Anything you can draw to a canvas (or decode to RGBA). Screenshots and logos give
especially clean palettes.

**Is it fast?**
Yes — it samples pixels (auto `step`) and quantizes a compact histogram, so even
large images resolve in milliseconds.

## Contributing

Contributions welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) and the
[Code of Conduct](./CODE_OF_CONDUCT.md).

```bash
git clone https://github.com/didrod205/huebrew.git
cd huebrew
npm install
npm test          # run the suite
npm run dev       # run the web studio locally
```

## 💖 Sponsor

huebrew is free, MIT-licensed, and built in spare time. If it saved you an hour
of eyedropping, please consider supporting it:

- ⭐ **Star this repo** — free, and it genuinely helps others find it.
- 🍋 **[Sponsor via Lemon Squeezy](https://elab-studio.lemonsqueezy.com/checkout/buy/5d059b89-51d0-456b-b33a-ed56994f7010)** — one-time or recurring support.

**Where your support goes:** more export targets (Figma tokens, Style Dictionary,
ASE/Adobe swatches), smarter palette roles (background/accent/neutral detection),
accessibility-aware ramp tuning, keeping the free web studio online, and fast
issue responses.

## License

[MIT](./LICENSE) © huebrew contributors
