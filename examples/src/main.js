import { Parser, Drawer } from "@zebrash/browser";

// Vite inlines the fixture set at build time and serves on demand in dev.
// `?raw` gives ZPL source as a string; `?url` gives the reference PNG path.
const zplLoaders = import.meta.glob("../../test/fixtures/*.zpl", {
  query: "?raw",
  import: "default",
});
const pngUrls = import.meta.glob("../../test/fixtures/*.png", {
  query: "?url",
  import: "default",
  eager: true,
});

// Mirrors test/golden.test.ts FIXTURE_OPTIONS — fixtures whose Go reference was
// captured at non-default canvas sizes or with a special output mode.
const FIXTURE_OPTIONS = {
  text_fallback_default: { labelWidthMm: 160, labelHeightMm: 230 },
  custom_ttf_by_alias: { labelWidthMm: 160 },
};

function basename(path) {
  return path
    .split("/")
    .pop()
    .replace(/\.(zpl|png)$/, "");
}

const fixtures = Object.keys(zplLoaders).map(basename).sort();
const referencePng = Object.fromEntries(
  Object.entries(pngUrls).map(([path, url]) => [basename(path), url]),
);

const els = {
  status: document.getElementById("status"),
  filter: document.getElementById("filter"),
  list: document.getElementById("fixture-list"),
  name: document.getElementById("fixture-name"),
  options: document.getElementById("fixture-options"),
  stats: document.getElementById("fixture-stats"),
  svgStats: document.getElementById("fixture-svg-stats"),
  renderImg: document.getElementById("render-img"),
  svgObj: document.getElementById("svg-obj"),
  svgDownload: document.getElementById("svg-download"),
  svgFontMode: document.getElementById("svg-font-mode"),
  referenceImg: document.getElementById("reference-img"),
  renderTime: document.getElementById("render-time"),
  svgTime: document.getElementById("svg-time"),
  zplSource: document.getElementById("zpl-source"),
  log: document.getElementById("log"),
};

let lastPngUrl = null;
let lastSvgUrl = null;
let activeFixture = null;

function setStatus(text, kind = "") {
  els.status.textContent = text;
  els.status.className = "status " + kind;
}

function logln(...parts) {
  els.log.textContent += parts.map(String).join(" ") + "\n";
}

function clearLog() {
  els.log.textContent = "";
}

async function loadZpl(name) {
  const key = Object.keys(zplLoaders).find((p) => basename(p) === name);
  if (!key) throw new Error(`unknown fixture: ${name}`);
  return zplLoaders[key]();
}

function buildList(names) {
  els.list.innerHTML = "";
  for (const name of names) {
    const li = document.createElement("li");
    li.textContent = name;
    li.dataset.fixture = name;
    li.addEventListener("click", () => selectFixture(name));
    els.list.appendChild(li);
  }
}

function highlightActive(name) {
  for (const li of els.list.querySelectorAll("li")) {
    li.classList.toggle("active", li.dataset.fixture === name);
  }
}

function applyFilter() {
  const q = els.filter.value.trim().toLowerCase();
  for (const li of els.list.querySelectorAll("li")) {
    const match = !q || li.dataset.fixture.toLowerCase().includes(q);
    li.classList.toggle("hidden", !match);
  }
}

async function selectFixture(name) {
  if (activeFixture === name) return;
  activeFixture = name;
  highlightActive(name);
  els.name.textContent = name;
  els.zplSource.textContent = "";
  clearLog();
  setStatus("loading…", "busy");
  location.hash = name;

  els.referenceImg.src = referencePng[name] ?? "";

  const opts = FIXTURE_OPTIONS[name] ?? {};
  els.options.textContent =
    Object.keys(opts).length === 0
      ? "default options"
      : Object.entries(opts)
          .map(([k, v]) => `${k}=${v}`)
          .join(" ");

  if (lastPngUrl) URL.revokeObjectURL(lastPngUrl);
  if (lastSvgUrl) URL.revokeObjectURL(lastSvgUrl);
  els.renderImg.removeAttribute("src");
  els.svgObj.removeAttribute("data");
  els.renderTime.textContent = "";
  els.svgTime.textContent = "";
  els.stats.textContent = "";
  els.svgStats.textContent = "";
  els.svgDownload.hidden = true;
  els.svgDownload.removeAttribute("href");

  try {
    const zpl = await loadZpl(name);
    els.zplSource.textContent = zpl;
    logln("zpl bytes:", zpl.length);

    const labels = new Parser().parse(zpl);
    logln("labels:", labels.length, "elements[0]:", labels[0]?.elements.length ?? 0);
    if (!labels[0]) throw new Error("no labels parsed");

    const drawer = new Drawer();

    // PNG render — same flow as before.
    const t0 = performance.now();
    const png = await drawer.drawLabelAsPng(labels[0], opts);
    const pngMs = performance.now() - t0;

    const pngBlob = new Blob([png], { type: "image/png" });
    lastPngUrl = URL.createObjectURL(pngBlob);
    els.renderImg.src = lastPngUrl;

    await new Promise((resolve, reject) => {
      els.renderImg.onload = () => resolve();
      els.renderImg.onerror = () => reject(new Error("PNG image load failed"));
    });

    els.renderTime.textContent = `${pngMs.toFixed(0)} ms`;
    els.stats.textContent = `${els.renderImg.naturalWidth}×${els.renderImg.naturalHeight} · ${png.byteLength.toLocaleString()} B`;
    logln("png rendered:", png.byteLength, "bytes in", pngMs.toFixed(0), "ms");

    // SVG render — uses the fontEmbed mode the user picked.
    const fontEmbed = els.svgFontMode.value || "url";
    const tSvg0 = performance.now();
    const svg = await drawer.drawLabelAsSvg(labels[0], { ...opts, fontEmbed });
    const svgMs = performance.now() - tSvg0;

    // <object data="blob:..."> so the browser fetches the SVG as a full
    // document and honours @font-face url(...) (unlike <img src=...> which
    // sandboxes external resource loads).
    const svgBlob = new Blob([svg], { type: "image/svg+xml" });
    lastSvgUrl = URL.createObjectURL(svgBlob);
    // Mirror the active fixture's intrinsic aspect ratio onto the <object>
    // so width/height in CSS scale proportionally — without this, <object>
    // collapses to a default replaced-element size that ignores the SVG's
    // viewBox.
    const aspectMatch = svg.match(/viewBox="\s*0\s+0\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s*"/);
    if (aspectMatch) {
      const w = Number.parseFloat(aspectMatch[1]);
      const h = Number.parseFloat(aspectMatch[2]);
      if (w > 0 && h > 0) {
        els.svgObj.style.aspectRatio = `${w} / ${h}`;
      }
    }
    els.svgObj.setAttribute("data", lastSvgUrl);
    els.svgDownload.href = lastSvgUrl;
    els.svgDownload.download = `${name}.svg`;
    els.svgDownload.hidden = false;

    els.svgTime.textContent = `${svgMs.toFixed(0)} ms`;
    els.svgStats.textContent = `svg ${(svg.length / 1024).toFixed(1)} KB · ${fontEmbed}`;
    logln("svg rendered:", svg.length, "chars in", svgMs.toFixed(0), "ms");

    setStatus(`OK · ${name}`, "ok");
  } catch (err) {
    logln("ERROR:", err.stack || err.message || err);
    setStatus(`FAIL · ${err.message || err}`, "err");
  }
}

function main() {
  if (fixtures.length === 0) {
    setStatus("no fixtures found in ../test/fixtures/", "err");
    return;
  }
  buildList(fixtures);
  els.filter.addEventListener("input", applyFilter);
  setStatus(`${fixtures.length} fixtures · pick one`, "ok");

  // Re-render the active fixture when the user toggles SVG font mode so they
  // can compare url / embed / none output side-by-side.
  els.svgFontMode.addEventListener("change", () => {
    if (activeFixture) {
      const current = activeFixture;
      activeFixture = null; // force selectFixture to do the work
      selectFixture(current);
    }
  });

  const initial = location.hash.slice(1);
  selectFixture(fixtures.includes(initial) ? initial : fixtures[0]);

  window.addEventListener("hashchange", () => {
    const next = location.hash.slice(1);
    if (next && next !== activeFixture && fixtures.includes(next)) {
      selectFixture(next);
    }
  });
}

main();
