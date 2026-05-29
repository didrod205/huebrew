# Changelog

All notable changes to this project are documented in this file. The format is
based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0]

### Added

- Initial release.
- `palette(source, options?)` — extract dominant colors from RGBA pixels or
  `ImageData`, most-common first, each as a rich `Swatch`.
- `dominant(source)` and low-level `quantize` / `quantizeWithCounts` (MMCQ).
- `ramp(rgb)` — 11-stop perceptual (OKLab) tint/shade ramp.
- Color helpers: `rgbToHex`, `hexToRgb`, `rgbToHsl`, `luminance`, `contrast`,
  `textColorFor`.
- Exporters: `toArray`, `toCSS`, `toSCSS`, `toJSON`, `toSVG`, `toTailwind`.
- Free, local-only web studio (drop/paste/drag an image) deployed to GitHub Pages.
- Zero runtime dependencies; ESM + CJS + TypeScript types.

[Unreleased]: https://github.com/didrod205/huebrew/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/didrod205/huebrew/releases/tag/v0.1.0
