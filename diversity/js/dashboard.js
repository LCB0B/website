/* Main controller — fetches paper-derived JSONs, wires the year slider & mosaic filter. */

const DATA = "data/";

const FILTER_LABELS = {
  hair: (v) => `${v} hair`,
  eyes: (v) => `${v} eyes`,
  region: (v) => v,
  rfm: (v) => `${v} RFM`,
  ethn: (v) => (v === "W" ? "white models" : "non-white models"),
};

async function loadJson(name) {
  const res = await fetch(`${DATA}${name}`);
  if (!res.ok) throw new Error(`failed to load ${name}: ${res.status}`);
  return res.json();
}

function buildPanels(data) {
  const palette = data.palette;
  const updaters = [];

  // ----- Event legend -----
  const legendRoot = document.getElementById("event-legend");
  if (legendRoot) {
    legendRoot.innerHTML = "";
    palette.event_order.forEach((ev) => {
      const span = document.createElement("span");
      span.innerHTML = `<i style="background:${palette.event[ev]}"></i>${ev.replace("_", " ")}`;
      legendRoot.appendChild(span);
    });
  }

  // ----- Body-measurement evolution: mean | σ | skewness (5 measurements × 3 cols) -----
  palette.measurements.forEach((m) => {
    const meas = Object.fromEntries(
      palette.event_order.map((ev) => [ev, data.measurements[ev]?.[m] || []])
    );
    const mom = Object.fromEntries(
      palette.event_order.map((ev) => [ev, data.moments[ev]?.[m] || []])
    );

    updaters.push(buildMeasurementPanel(`#plot-mean-${m}`, meas, palette, {
      label: "",
      yLim: palette.y_lims[m],
      valueKey: "mean",
      semKey: "sem",
    }));

    const allStds = palette.event_order.flatMap((ev) => (data.measurements[ev]?.[m] || []).map((d) => d.std)).filter(Number.isFinite);
    const sigmaYLim = allStds.length ? [Math.min(...allStds) * 0.85, Math.max(...allStds) * 1.15] : [0, 1];
    updaters.push(buildMeasurementPanel(`#plot-std-${m}`, meas, palette, {
      label: "",
      yLim: sigmaYLim,
      valueKey: "std",
      bandLoKey: "std_lo",
      bandHiKey: "std_hi",
      greyBg: true,
    }));

    const allSkews = palette.event_order.flatMap((ev) => (data.moments[ev]?.[m] || []).map((d) => d.skewness)).filter(Number.isFinite);
    const skewMin = allSkews.length ? Math.min(...allSkews) : -1;
    const skewMax = allSkews.length ? Math.max(...allSkews) : 1;
    const skewLim = [Math.min(skewMin, -0.2) * 1.05, Math.max(skewMax, 0.2) * 1.05];
    updaters.push(buildMeasurementPanel(`#plot-skew-${m}`, mom, palette, {
      label: "",
      yLim: skewLim,
      valueKey: "skewness",
      zeroLine: true,
    }));
  });

  // ----- Hair / Eyes / World region stacked bars (paper palette) — clickable to filter mosaic
  updaters.push(buildStackedBarsPanel(
    "#plot-hair", data.categorical.hair, palette.hair, { label: "Hair colour", variable: "hair" }
  ));
  updaters.push(buildStackedBarsPanel(
    "#plot-eyes", data.categorical.eyes, palette.eyes, { label: "Eye colour", variable: "eyes" }
  ));
  updaters.push(buildStackedBarsPanel(
    "#plot-region", data.categorical.world_region, palette.region, { label: "World region", variable: "region" }
  ));

  if (data.tails?.fashion_shows?.rfm) {
    updaters.push(buildTailsPanel(
      "#plot-tails", data.tails.fashion_shows, "rfm", "RFM tails (P10–P90)", { variable: "rfm" }
    ));
  } else {
    document.querySelector("#plot-tails").innerHTML = '<div style="padding:10px;color:#999">No tail data</div>';
  }

  updaters.push(buildNonWhiteSharePanel("#plot-inter", data.mosaic));

  const mosaicUpdater = buildMosaic("#mosaic", "#mosaic-meta", data.mosaic);

  return { updaters, mosaicUpdater };
}

function buildTimeline() {
  const slider = document.getElementById("year-slider");
  const ticks = document.querySelector(".timeline-ticks");
  const labels = document.querySelector(".timeline-labels");
  if (!ticks || !labels) return;
  ticks.innerHTML = "";
  labels.innerHTML = "";
  const yMin = Number(slider.min);
  const yMax = Number(slider.max);
  for (let y = yMin; y <= yMax; y += 1) {
    const pct = ((y - yMin) / (yMax - yMin)) * 100;
    const major = y === yMin || y === yMax || y % 5 === 0;
    const tick = document.createElement("span");
    tick.className = `tick${major ? " major" : ""}`;
    tick.style.left = `${pct}%`;
    ticks.appendChild(tick);
    if (major) {
      const lab = document.createElement("span");
      lab.className = "tick-label";
      lab.style.left = `${pct}%`;
      lab.textContent = String(y);
      labels.appendChild(lab);
    }
  }
}

function wireSliderAndFilter({ updaters, mosaicUpdater }) {
  const slider = document.getElementById("year-slider");
  const yearVal = document.getElementById("year-value");
  const pill = document.getElementById("filter-pill");
  const pillText = document.getElementById("filter-pill-text");
  buildTimeline();

  let activeFilter = null; // { variable, value } | null
  let currentYear = Number(slider.value);

  function renderPill() {
    if (!activeFilter) {
      pill.classList.add("hidden");
      return;
    }
    const label = FILTER_LABELS[activeFilter.variable]?.(activeFilter.value) ?? `${activeFilter.value}`;
    pillText.textContent = `Filter: ${label} · ${currentYear}`;
    pill.classList.remove("hidden");
  }

  const marker = document.querySelector(".timeline-marker");
  const markerYear = document.querySelector(".timeline-marker-year");
  const yMin = Number(slider.min);
  const yMax = Number(slider.max);
  function syncMarker() {
    if (!marker) return;
    const pct = ((currentYear - yMin) / (yMax - yMin)) * 100;
    marker.style.left = `${pct}%`;
    if (markerYear) markerYear.textContent = String(currentYear);
  }

  const mosaicYear = document.getElementById("mosaic-year");
  function applyAll() {
    yearVal.textContent = currentYear;
    if (mosaicYear) mosaicYear.textContent = currentYear;
    updaters.forEach((u) => u.update(currentYear));
    mosaicUpdater.update(currentYear, activeFilter);
    syncMarker();
    renderPill();
  }

  function setFilter(variable, value) {
    if (activeFilter && activeFilter.variable === variable && activeFilter.value === value) {
      activeFilter = null;
    } else {
      activeFilter = { variable, value };
    }
    mosaicUpdater.update(currentYear, activeFilter);
    renderPill();
  }

  let pendingYear = null;
  let rafId = 0;
  slider.addEventListener("input", (e) => {
    pendingYear = Number(e.target.value);
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      currentYear = pendingYear;
      applyAll();
    });
  });

  window.addEventListener("dashboard:filter", (e) => {
    const { variable, value } = e.detail;
    if (variable && value) setFilter(variable, value);
  });

  pill.addEventListener("click", () => {
    activeFilter = null;
    mosaicUpdater.update(currentYear, null);
    renderPill();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && activeFilter) {
      activeFilter = null;
      mosaicUpdater.update(currentYear, null);
      renderPill();
    }
  });

  const qp = new URLSearchParams(window.location.search);
  const initialYear = Number(qp.get("year") || slider.value);
  if (initialYear >= 2000 && initialYear <= 2024) {
    slider.value = String(initialYear);
    currentYear = initialYear;
  }
  // Optional initial filter via ?filter=variable:value (e.g. hair:blonde).
  const filterStr = qp.get("filter");
  if (filterStr && filterStr.includes(":")) {
    const [variable, value] = filterStr.split(":", 2);
    if (variable && value) activeFilter = { variable, value };
  }
  applyAll();
  if (typeof mosaicUpdater.preloadAll === "function") mosaicUpdater.preloadAll();
}

async function init() {
  const [mosaic, measurements, categorical, tails, moments, entropy, intersectionality, palette] = await Promise.all([
    loadJson("mosaic_index.json"),
    loadJson("measurements.json"),
    loadJson("categorical.json"),
    loadJson("tails.json"),
    loadJson("moments.json"),
    loadJson("entropy.json"),
    loadJson("intersectionality.json"),
    loadJson("palette.json"),
  ]);
  const built = buildPanels({ mosaic, measurements, categorical, tails, moments, entropy, intersectionality, palette });
  wireSliderAndFilter(built);
}

window.addEventListener("DOMContentLoaded", init);
let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => init().catch((e) => console.error(e)), 200);
});
