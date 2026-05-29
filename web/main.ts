import {
  palette,
  toArray,
  toCSS,
  toJSON,
  toSCSS,
  toSVG,
  toTailwind,
  type Swatch,
} from "../src/index";

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

const fileInput = $<HTMLInputElement>("file");
const canvas = $<HTMLCanvasElement>("canvas");
const preview = $<HTMLImageElement>("preview");
const swatchesEl = $<HTMLDivElement>("swatches");
const countSel = $<HTMLSelectElement>("count");
const exportsEl = $<HTMLElement>("exports");
const tabsEl = $<HTMLDivElement>("tabs");
const exportOut = $<HTMLPreElement>("export-out");
const exportName = $<HTMLSpanElement>("export-name");

let current: Swatch[] = [];
let activeFormat = "CSS";

const FORMATS: Record<string, (s: Swatch[]) => string> = {
  CSS: (s) => toCSS(s),
  SCSS: (s) => toSCSS(s),
  Tailwind: (s) => JSON.stringify(toTailwind(s), null, 2),
  JSON: (s) => toJSON(s),
  SVG: (s) => toSVG(s),
  Array: (s) => toArray(s).join("\n"),
};

function toast(btn: HTMLButtonElement, msg = "Copied!") {
  const prev = btn.textContent;
  btn.textContent = msg;
  setTimeout(() => (btn.textContent = prev), 1100);
}

function renderSwatches(): void {
  swatchesEl.innerHTML = "";
  for (const s of current) {
    const card = document.createElement("button");
    card.className = "swatch";
    card.style.background = s.hex;
    card.style.color = s.textColor;
    card.title = "Click to copy " + s.hex;
    card.innerHTML = `<span class="hex">${s.hex}</span><span class="rgb">${s.rgb.join(", ")}</span>`;
    card.addEventListener("click", () => {
      navigator.clipboard.writeText(s.hex);
      const hex = card.querySelector(".hex") as HTMLElement;
      const prev = hex.textContent;
      hex.textContent = "copied";
      setTimeout(() => (hex.textContent = prev), 900);
    });
    swatchesEl.append(card);
  }
}

function renderExport(): void {
  if (current.length === 0) {
    exportsEl.hidden = true;
    return;
  }
  exportsEl.hidden = false;
  exportName.textContent = activeFormat;
  exportOut.textContent = (FORMATS[activeFormat] ?? FORMATS.CSS)!(current);
  Array.from(tabsEl.querySelectorAll("button")).forEach((btn) => {
    btn.classList.toggle("active", btn.textContent === activeFormat);
  });
}

function recompute(): void {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx || canvas.width === 0) return;
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  current = palette(data, { colors: Number(countSel.value) });
  renderSwatches();
  renderExport();
}

function drawToCanvas(source: CanvasImageSource, w: number, h: number): void {
  const max = 400;
  const scale = Math.min(1, max / Math.max(w, h));
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  recompute();
}

function loadFile(file: File): void {
  const url = URL.createObjectURL(file);
  preview.onload = () => {
    preview.hidden = false;
    drawToCanvas(preview, preview.naturalWidth, preview.naturalHeight);
    URL.revokeObjectURL(url);
  };
  preview.src = url;
}

function loadSample(): void {
  // Paint a colorful sample so people can try it without a file.
  const c = document.createElement("canvas");
  c.width = 300;
  c.height = 200;
  const ctx = c.getContext("2d")!;
  const blocks = ["#0f4c81", "#e94f37", "#f6c026", "#3aafa9", "#23232b"];
  blocks.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect((i * c.width) / blocks.length, 0, c.width / blocks.length, c.height);
  });
  preview.hidden = false;
  preview.src = c.toDataURL();
  drawToCanvas(c, c.width, c.height);
}

// Build export tabs
for (const name of Object.keys(FORMATS)) {
  const btn = document.createElement("button");
  btn.textContent = name;
  btn.addEventListener("click", () => {
    activeFormat = name;
    renderExport();
  });
  tabsEl.append(btn);
}

$("pick").addEventListener("click", () => fileInput.click());
$("sample").addEventListener("click", loadSample);
$("copy-export").addEventListener("click", (e) => {
  navigator.clipboard.writeText(exportOut.textContent ?? "");
  toast(e.currentTarget as HTMLButtonElement);
});
fileInput.addEventListener("change", () => {
  const f = fileInput.files?.[0];
  if (f) loadFile(f);
});
countSel.addEventListener("change", recompute);

// Drag & drop
const drop = $("drop");
["dragover", "dragenter"].forEach((ev) =>
  drop.addEventListener(ev, (e) => {
    e.preventDefault();
    drop.classList.add("over");
  }),
);
["dragleave", "drop"].forEach((ev) =>
  drop.addEventListener(ev, () => drop.classList.remove("over")),
);
drop.addEventListener("drop", (e) => {
  e.preventDefault();
  const f = (e as DragEvent).dataTransfer?.files?.[0];
  if (f && f.type.startsWith("image/")) loadFile(f);
});

// Paste an image from clipboard
window.addEventListener("paste", (e) => {
  const item = Array.from((e as ClipboardEvent).clipboardData?.items ?? []).find((i) =>
    i.type.startsWith("image/"),
  );
  const f = item?.getAsFile();
  if (f) loadFile(f);
});
