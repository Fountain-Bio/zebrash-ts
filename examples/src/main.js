import { Parser, Drawer } from "zebrash";

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
  renderImg: document.getElementById("render-img"),
  referenceImg: document.getElementById("reference-img"),
  renderTime: document.getElementById("render-time"),
  zplSource: document.getElementById("zpl-source"),
  log: document.getElementById("log"),
};

let lastObjectUrl = null;
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

  if (lastObjectUrl) URL.revokeObjectURL(lastObjectUrl);
  els.renderImg.removeAttribute("src");
  els.renderTime.textContent = "";
  els.stats.textContent = "";

  try {
    const zpl = await loadZpl(name);
    els.zplSource.textContent = zpl;
    logln("zpl bytes:", zpl.length);

    const labels = new Parser().parse(zpl);
    logln("labels:", labels.length, "elements[0]:", labels[0]?.elements.length ?? 0);
    if (!labels[0]) throw new Error("no labels parsed");

    const t0 = performance.now();
    const png = await new Drawer().drawLabelAsPng(labels[0], opts);
    const ms = performance.now() - t0;

    const blob = new Blob([png], { type: "image/png" });
    lastObjectUrl = URL.createObjectURL(blob);
    els.renderImg.src = lastObjectUrl;

    await new Promise((resolve, reject) => {
      els.renderImg.onload = () => resolve();
      els.renderImg.onerror = () => reject(new Error("image load failed"));
    });

    els.renderTime.textContent = `${ms.toFixed(0)} ms`;
    els.stats.textContent = `${els.renderImg.naturalWidth}×${els.renderImg.naturalHeight} · ${png.byteLength.toLocaleString()} B`;

    logln("rendered:", png.byteLength, "bytes in", ms.toFixed(0), "ms");
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
