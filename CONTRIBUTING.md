# Contributing to huebrew

Thanks for taking the time to contribute! 🎉 huebrew aims to be a small,
dependency-free, **deterministic** tool. Contributions are reviewed with that in
mind.

## Getting started

```bash
git clone https://github.com/didrod205/huebrew.git
cd huebrew
npm install
```

| Command | What it does |
| ------- | ------------ |
| `npm test` | Run the test suite (Vitest). |
| `npm run test:watch` | Re-run tests on change. |
| `npm run typecheck` | Type-check without emitting. |
| `npm run build` | Build the library (`dist/`). |
| `npm run build:web` | Build the web studio (`docs/`). |
| `npm run dev` | Run the web studio locally (`vite`). |

## Good contributions

- **New export formats** (Figma tokens, Style Dictionary, ASE, etc.) in `src/format.ts`.
- **Palette quality** improvements to `src/quantize.ts` — back changes with tests
  using synthetic pixel buffers so results stay deterministic.
- **Ramp / color science** tweaks in `src/color.ts`, with a reference.
- **Web studio UX** and docs.

## Rules of the road

1. Every behavior change needs a test. Build pixel buffers programmatically so
   expectations are exact and reproducible.
2. `npm run typecheck` and `npm test` must pass.
3. Keep the public API small and the package **zero-dependency** (the core must
   not import an image decoder — it operates on raw RGBA pixels).

## Reporting bugs

Open an issue with the input (a small image or a pixel buffer), the options used,
the palette you got, and the palette you expected.

By contributing you agree your contributions are licensed under the project's
[MIT License](./LICENSE).
