# huebrew — Product & Strategy

Why huebrew exists, who it's for, how it's positioned, and how it could sustain itself.

## 1. Why this idea

Everyone who builds anything visual eventually needs *"these colors, as code."*
You have a screenshot, a photo, a logo, a moodboard — and you need its palette in
your stylesheet, your Tailwind config, or your design tokens. Today that's a
chore: eyedrop pixels one by one, or paste your image into a website that wants
your email and uploads your file.

huebrew turns any image into a usable theme in one drop — extracting the **real**
dominant colors with deterministic median-cut quantization, then generating
**perceptually-even OKLab ramps** and copy-paste exports. It's the kind of thing
people try once and think *"why didn't I have this?"*

It also nails the hard constraints: **AI can't replace it** (LLMs hallucinate hex
codes; exact pixel-level extraction is algorithmic), **no server**, **no API
key**, **runs in the browser or any JS runtime**, immediate value, broad audience.

## 2. Competitor analysis

| Tool | What it does | Gaps huebrew fills |
| ---- | ------------ | ------------------ |
| Color Thief (lib) | Extract swatches | Pulls in canvas/node-canvas; swatches only — no theme/ramps/exports |
| Coolors / Adobe Color (web) | Build & browse palettes | Account/upload flow; not a dependency-free library; not "from my image, locally" |
| "Image color extractor" sites | Show colors from an upload | **Upload required**; ad-heavy; no developer exports |
| `node-vibrant` | Vibrant/muted swatches | Heavier, opinionated categories; no ramp/token exports |
| Eyedropper / browser tools | Pick one pixel | Manual, one color at a time, no theme output |

**Nobody** combines: dependency-free + runs on raw pixels in any runtime +
perceptual OKLab ramps + CSS/SCSS/Tailwind/JSON/SVG exports + a polished
local-only web studio.

## 3. Differentiation

1. **Theme, not just swatches** — 50→950 OKLab ramps and real export targets.
2. **Zero dependencies, decoder-agnostic** — the core never imports an image
   library; it works on RGBA pixels in browser, Node, Deno, Bun.
3. **Local-first** — nothing is uploaded, ever.
4. **Deterministic & tested** — MMCQ with synthetic-buffer tests; reproducible.
5. **Designer + developer + marketer** appeal in one tool.

## 4. Folder structure

```
huebrew/
├─ src/         color.ts · quantize.ts (MMCQ) · format.ts · index.ts
├─ test/        synthetic-pixel tests
├─ web/         Vite studio → docs/ (GitHub Pages)
├─ .github/     ci · release · pages workflows, templates, FUNDING
└─ README · LICENSE · CONTRIBUTING · CODE_OF_CONDUCT · CHANGELOG · PRODUCT
```

## 9. GitHub Topics

```
color-palette, palette-extractor, image-colors, dominant-color, median-cut,
oklch, oklab, tailwind-colors, design-tokens, color-scheme, theme-generator,
css-variables, zero-dependency
```

## 10. Product Hunt launch copy

**Tagline:** Brew a color palette — and a ready-to-use theme — from any image. Locally.

**Description:**
> Drop a screenshot, photo, or logo and huebrew extracts its real dominant
> colors, builds perceptually-even tint/shade ramps, and gives you a theme you
> can paste straight into your code: CSS variables, Tailwind colors, SCSS, JSON,
> or an SVG strip.
>
> No upload, no account, no API key — it all runs in your browser. There's also a
> zero-dependency npm library that works on raw pixels in any JS runtime.
>
> Free & open-source (MIT). 🎨

**First comment (maker):** "I was tired of eyedropping mockups pixel by pixel and
of palette sites that wanted my image and my email. So I made the opposite: 100%
local, and it outputs an actual theme, not just six swatches."

## 11. npm package name

- **Primary:** `huebrew` (brandable, memorable, available).
- Discoverability via keyword topics and SEO (below) rather than a generic name.

## 12. SEO keyword strategy

Intent-rich long-tail queries:

- "extract color palette from image", "get colors from image"
- "image to tailwind colors", "image to css variables"
- "dominant color javascript", "color thief alternative"
- "generate color palette from photo", "logo to brand colors"
- "oklch color ramp generator", "palette from screenshot"

Tactics: descriptive `<title>`/meta on the studio (done), README phrasing,
per-use-case docs ("Generate a Tailwind theme from an image"), GitHub topics, and
the GitHub Pages studio as an indexable landing page.

## 13. Monetization (without breaking the free, local promise)

Core stays free, open-source, local forever.

1. **Sponsorship** — Lemon Squeezy (wired up), with a clear "where it goes" note.
2. **Pro exports / integrations** — a paid Figma plugin, Style Dictionary / design
   token pipeline output, ASE (Adobe) export, or a CLI with built-in decoding.
3. **Funded features** — companies sponsor roadmap items (palette roles,
   accessibility-tuned ramps, brand-kit generation).

Guardrails: never upload user images, never add telemetry, never paywall existing
functionality.
