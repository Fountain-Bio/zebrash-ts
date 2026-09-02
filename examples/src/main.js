import { Drawer, Parser } from "@zebrash/browser";

import { createLabelPdf } from "./pdf.js";

const DEFAULT_OPTIONS = {
  labelWidthMm: 101.6,
  labelHeightMm: 203.2,
  dpmm: 8,
  enableInvertedLabels: true,
  grayscaleOutput: false,
  fontEmbed: "url",
};

// These references were generated using a non-default label size.
const FIXTURE_OPTIONS = {
  custom_ttf_by_alias: { labelWidthMm: 160 },
  text_fallback_default: { labelWidthMm: 160, labelHeightMm: 230 },
};

const zplLoaders = import.meta.glob("../../test/fixtures/*.zpl", {
  query: "?raw",
  import: "default",
});

function basename(path) {
  return path
    .split("/")
    .pop()
    .replace(/\.zpl$/, "");
}

function displayName(name) {
  return name.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const fixturePaths = new Map(Object.keys(zplLoaders).map((path) => [basename(path), path]));
const fixtureNames = [...fixturePaths.keys()].sort();

const elements = {
  source: document.getElementById("zpl-input"),
  sourceStats: document.getElementById("source-stats"),
  example: document.getElementById("example-select"),
  width: document.getElementById("label-width"),
  height: document.getElementById("label-height"),
  density: document.getElementById("print-density"),
  grayscale: document.getElementById("grayscale-output"),
  inverted: document.getElementById("enable-inverted"),
  fontMode: document.getElementById("svg-font-mode"),
  renderButton: document.getElementById("render-button"),
  shareButton: document.getElementById("share-button"),
  status: document.getElementById("status"),
  error: document.getElementById("error-message"),
  previousLabel: document.getElementById("previous-label"),
  nextLabel: document.getElementById("next-label"),
  labelPosition: document.getElementById("label-position"),
  pngPreview: document.getElementById("png-preview"),
  svgPreview: document.getElementById("svg-preview"),
  pngStats: document.getElementById("png-stats"),
  svgStats: document.getElementById("svg-stats"),
  pngDownload: document.getElementById("png-download"),
  pdfDownload: document.getElementById("pdf-download"),
  svgDownload: document.getElementById("svg-download"),
};

let labels = [];
let activeLabelIndex = 0;
let renderTimer = null;
let renderVersion = 0;
let pngUrl = null;
let svgUrl = null;
let pdfPage = null;
let downloadBaseName = "label";
let exampleLoadVersion = 0;

function setStatus(message, kind = "") {
  elements.status.textContent = message;
  elements.status.className = `status ${kind}`.trim();
}

function setError(error) {
  if (error === null) {
    elements.error.hidden = true;
    elements.error.textContent = "";
    return;
  }

  elements.error.textContent = error instanceof Error ? error.message : String(error);
  elements.error.hidden = false;
}

function setSourceStats() {
  const count = elements.source.value.length;
  elements.sourceStats.textContent = `${count.toLocaleString()} ${count === 1 ? "character" : "characters"}`;
}

function readPositiveNumber(input, label) {
  const value = Number(input.value);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a number greater than zero.`);
  }
  return value;
}

function readOptions() {
  const options = {
    labelWidthMm: readPositiveNumber(elements.width, "Label width"),
    labelHeightMm: readPositiveNumber(elements.height, "Label height"),
    dpmm: readPositiveNumber(elements.density, "Print density"),
    enableInvertedLabels: elements.inverted.checked,
    grayscaleOutput: elements.grayscale.checked,
    fontEmbed: elements.fontMode.value,
  };

  const pixelWidth = Math.ceil(options.labelWidthMm * options.dpmm);
  const pixelHeight = Math.ceil(options.labelHeightMm * options.dpmm);
  if (pixelWidth > 16_384 || pixelHeight > 16_384 || pixelWidth * pixelHeight > 20_000_000) {
    throw new Error(
      `The requested ${pixelWidth.toLocaleString()}×${pixelHeight.toLocaleString()} canvas is too large. Reduce the label dimensions or print density.`,
    );
  }

  return options;
}

function applyOptions(options = {}) {
  const merged = { ...DEFAULT_OPTIONS, ...options };
  elements.width.value = String(merged.labelWidthMm);
  elements.height.value = String(merged.labelHeightMm);
  elements.density.value = String(merged.dpmm);
  elements.inverted.checked = merged.enableInvertedLabels;
  elements.grayscale.checked = merged.grayscaleOutput;
  elements.fontMode.value = merged.fontEmbed;
}

function updateLabelNavigation() {
  const count = labels.length;
  elements.labelPosition.textContent =
    count === 0 ? "Label 0 of 0" : `Label ${activeLabelIndex + 1} of ${count}`;
  elements.previousLabel.disabled = count < 2 || activeLabelIndex === 0;
  elements.nextLabel.disabled = count < 2 || activeLabelIndex === count - 1;
}

function revokePreviewUrls() {
  if (pngUrl !== null) {
    URL.revokeObjectURL(pngUrl);
    pngUrl = null;
  }
  if (svgUrl !== null) {
    URL.revokeObjectURL(svgUrl);
    svgUrl = null;
  }
}

function clearPreviews() {
  revokePreviewUrls();
  pdfPage = null;
  elements.pngPreview.removeAttribute("src");
  elements.svgPreview.removeAttribute("data");
  elements.pngDownload.removeAttribute("href");
  elements.svgDownload.removeAttribute("href");
  elements.pngDownload.hidden = true;
  elements.svgDownload.hidden = true;
  elements.pdfDownload.hidden = true;
  elements.pngStats.textContent = "";
  elements.svgStats.textContent = "";
}

async function render(resetLabel = false) {
  if (renderTimer !== null) {
    window.clearTimeout(renderTimer);
    renderTimer = null;
  }

  const version = ++renderVersion;
  elements.renderButton.disabled = true;
  setError(null);
  setStatus("Rendering…", "busy");

  try {
    const options = readOptions();
    const source = elements.source.value;
    if (source.trim() === "") {
      throw new Error("Enter ZPL containing at least one ^XA…^XZ label.");
    }

    const parsedLabels = new Parser().parse(source);
    if (parsedLabels.length === 0) {
      throw new Error(
        "No renderable labels found. A label must contain fields between ^XA and ^XZ.",
      );
    }

    labels = parsedLabels;
    if (resetLabel) {
      activeLabelIndex = 0;
    } else {
      activeLabelIndex = Math.min(activeLabelIndex, labels.length - 1);
    }
    updateLabelNavigation();

    const label = labels[activeLabelIndex];
    const drawer = new Drawer();
    const startedAt = performance.now();
    const [png, svg] = await Promise.all([
      drawer.drawLabelAsPng(label, options),
      drawer.drawLabelAsSvg(label, options),
    ]);
    const elapsedMs = performance.now() - startedAt;

    if (version !== renderVersion) {
      return;
    }

    revokePreviewUrls();
    const pngBlob = new Blob([png], { type: "image/png" });
    const svgBlob = new Blob([svg], { type: "image/svg+xml" });
    pngUrl = URL.createObjectURL(pngBlob);
    svgUrl = URL.createObjectURL(svgBlob);

    const pixelWidth = Math.ceil(options.labelWidthMm * options.dpmm);
    const pixelHeight = Math.ceil(options.labelHeightMm * options.dpmm);
    const filename = `${downloadBaseName}-${activeLabelIndex + 1}`;

    elements.pngPreview.src = pngUrl;
    elements.svgPreview.style.aspectRatio = `${pixelWidth} / ${pixelHeight}`;
    elements.svgPreview.style.setProperty("--label-ratio", String(pixelWidth / pixelHeight));
    elements.svgPreview.data = svgUrl;

    pdfPage = {
      blob: pngBlob,
      widthMm: options.labelWidthMm,
      heightMm: options.labelHeightMm,
      filename: `${filename}.pdf`,
    };

    elements.pngDownload.href = pngUrl;
    elements.pngDownload.download = `${filename}.png`;
    elements.pngDownload.hidden = false;
    elements.pdfDownload.hidden = false;
    elements.svgDownload.href = svgUrl;
    elements.svgDownload.download = `${filename}.svg`;
    elements.svgDownload.hidden = false;

    elements.pngStats.textContent = `${pixelWidth}×${pixelHeight} · ${(pngBlob.size / 1024).toFixed(1)} KB`;
    elements.svgStats.textContent = `${(svgBlob.size / 1024).toFixed(1)} KB · ${options.fontEmbed} fonts`;
    setStatus(
      `${labels.length} ${labels.length === 1 ? "label" : "labels"} · ${elapsedMs.toFixed(0)} ms`,
      "ok",
    );
  } catch (error) {
    if (version !== renderVersion) {
      return;
    }
    labels = [];
    activeLabelIndex = 0;
    updateLabelNavigation();
    clearPreviews();
    setError(error);
    setStatus("Render failed", "error");
  } finally {
    if (version === renderVersion) {
      elements.renderButton.disabled = false;
    }
  }
}

/** Hands the browser a generated file without leaking the object URL. */
function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoking immediately can cancel the download in some browsers.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

async function downloadPdf() {
  if (pdfPage === null) {
    return;
  }

  const page = pdfPage;
  elements.pdfDownload.disabled = true;
  setStatus("Building PDF…", "busy");
  try {
    const pdf = await createLabelPdf([page], { title: page.filename.replace(/\.pdf$/, "") });
    const blob = new Blob([pdf], { type: "application/pdf" });
    saveBlob(blob, page.filename);
    setStatus(
      `PDF saved · ${page.widthMm} × ${page.heightMm} mm · ${(blob.size / 1024).toFixed(1)} KB`,
      "ok",
    );
  } catch (error) {
    setError(error);
    setStatus("Could not build the PDF", "error");
  } finally {
    elements.pdfDownload.disabled = false;
  }
}

function scheduleRender(resetLabel = false) {
  if (renderTimer !== null) {
    window.clearTimeout(renderTimer);
  }
  renderTimer = window.setTimeout(() => {
    render(resetLabel);
  }, 350);
}

async function selectExample(name) {
  const path = fixturePaths.get(name);
  if (path === undefined) {
    return;
  }

  const loadVersion = ++exampleLoadVersion;
  setError(null);
  setStatus("Loading example…", "busy");
  try {
    const source = await zplLoaders[path]();
    if (loadVersion !== exampleLoadVersion) {
      return;
    }
    elements.source.value = source;
    elements.example.value = name;
    applyOptions(FIXTURE_OPTIONS[name]);
    downloadBaseName = name;
    setSourceStats();
    await render(true);
  } catch (error) {
    if (loadVersion === exampleLoadVersion) {
      setError(error);
      setStatus("Could not load example", "error");
    }
  }
}

function bytesToBase64Url(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64UrlToBytes(encoded) {
  const base64 = encoded.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function createShareUrl() {
  const options = readOptions();
  const params = new URLSearchParams({
    zpl: bytesToBase64Url(new TextEncoder().encode(elements.source.value)),
    w: String(options.labelWidthMm),
    h: String(options.labelHeightMm),
    d: String(options.dpmm),
    f: options.fontEmbed,
    l: String(activeLabelIndex),
  });
  if (options.grayscaleOutput) {
    params.set("g", "1");
  }
  if (options.enableInvertedLabels) {
    params.set("i", "1");
  }

  const url = new URL(window.location.href);
  url.hash = params.toString();
  return url.toString();
}

async function copyText(text) {
  if (navigator.clipboard !== undefined) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall through to the selection-based clipboard API.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) {
    throw new Error("The browser did not allow clipboard access.");
  }
}

async function shareCurrentLabel() {
  try {
    const url = createShareUrl();
    window.history.replaceState(null, "", url);
    await copyText(url);
    setStatus(`Share link copied · ${(url.length / 1024).toFixed(1)} KB`, "ok");
  } catch (error) {
    setError(error);
    setStatus("Could not copy share link", "error");
  }
}

function loadSharedState() {
  const rawHash = window.location.hash.slice(1);
  if (rawHash === "") {
    return false;
  }

  // Preserve links from the original fixture viewer, such as #fedex.
  if (!rawHash.includes("=")) {
    const fixture = decodeURIComponent(rawHash);
    if (fixturePaths.has(fixture)) {
      selectExample(fixture);
      return true;
    }
    return false;
  }

  try {
    const params = new URLSearchParams(rawHash);
    const encodedSource = params.get("zpl");
    if (encodedSource === null) {
      return false;
    }

    elements.source.value = new TextDecoder().decode(base64UrlToBytes(encodedSource));
    elements.example.value = "";
    applyOptions({
      labelWidthMm: Number(params.get("w")) || DEFAULT_OPTIONS.labelWidthMm,
      labelHeightMm: Number(params.get("h")) || DEFAULT_OPTIONS.labelHeightMm,
      dpmm: Number(params.get("d")) || DEFAULT_OPTIONS.dpmm,
      enableInvertedLabels: params.get("i") === "1",
      grayscaleOutput: params.get("g") === "1",
      fontEmbed: ["url", "embed", "none"].includes(params.get("f"))
        ? params.get("f")
        : DEFAULT_OPTIONS.fontEmbed,
    });
    activeLabelIndex = Math.max(0, Number.parseInt(params.get("l") ?? "0", 10) || 0);
    downloadBaseName = "shared-label";
    setSourceStats();
    render(false);
    return true;
  } catch (error) {
    setError(
      new Error(
        `Could not read the shared label: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
    setStatus("Invalid share link", "error");
    return false;
  }
}

function populateExamples() {
  const fragment = document.createDocumentFragment();
  for (const name of fixtureNames) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = displayName(name);
    fragment.appendChild(option);
  }
  elements.example.appendChild(fragment);
}

function registerEvents() {
  elements.source.addEventListener("input", () => {
    exampleLoadVersion += 1;
    elements.example.value = "";
    downloadBaseName = "label";
    setSourceStats();
    scheduleRender(true);
  });

  elements.source.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      render(true);
    }
  });

  elements.example.addEventListener("change", () => {
    if (elements.example.value !== "") {
      selectExample(elements.example.value);
    }
  });

  for (const control of [
    elements.width,
    elements.height,
    elements.density,
    elements.grayscale,
    elements.inverted,
    elements.fontMode,
  ]) {
    control.addEventListener("change", () => scheduleRender(false));
  }

  elements.renderButton.addEventListener("click", () => render(false));
  elements.shareButton.addEventListener("click", shareCurrentLabel);
  elements.pdfDownload.addEventListener("click", downloadPdf);
  elements.previousLabel.addEventListener("click", () => {
    if (activeLabelIndex > 0) {
      activeLabelIndex -= 1;
      render(false);
    }
  });
  elements.nextLabel.addEventListener("click", () => {
    if (activeLabelIndex < labels.length - 1) {
      activeLabelIndex += 1;
      render(false);
    }
  });
  window.addEventListener("beforeunload", revokePreviewUrls);
}

function main() {
  populateExamples();
  registerEvents();
  applyOptions();
  updateLabelNavigation();
  if (!loadSharedState()) {
    selectExample(fixturePaths.has("labelary") ? "labelary" : fixtureNames[0]);
  }
}

main();
