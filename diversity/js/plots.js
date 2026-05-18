/* Paper-styled D3 plot builders. Each builder returns { update(year) }. */

const MARGIN = { top: 20, right: 4, bottom: 18, left: 32 };
const STD_PANEL_BG = "#f5f5f5";
const INK = "#1a1a1a";
const LABEL_FS = 14;
const AXIS_FS = 11;

function makeSvg(selector, width, height) {
  const root = d3.select(selector);
  root.selectAll("*").remove();
  return root.append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "none")
    .style("width", "100%")
    .style("height", "100%");
}

function styleAxis(g) {
  g.classed("axis", true);
  g.selectAll("text").attr("fill", INK).style("font-family", "inherit").style("font-size", `${AXIS_FS}px`);
  g.selectAll("path, line").attr("stroke", INK).attr("stroke-width", 0.5).attr("shape-rendering", "crispEdges");
}

function panelLabel(svg, text, width) {
  if (!text) return;
  // Top-left, above the plot area (y < MARGIN.top so it sits above the axis).
  svg.append("text")
    .attr("x", MARGIN.left).attr("y", LABEL_FS + 1)
    .attr("text-anchor", "start")
    .attr("fill", INK).attr("font-size", LABEL_FS)
    .attr("font-weight", 600)
    .text(text);
}

/* ---------- Per-measurement single-line evolution per event ----------
 * Generic helper used for mean, σ, and skewness columns.
 * opts: { label, yLim, valueKey, semKey?, bandLoKey?, bandHiKey?, greyBg?, zeroLine? }
 */
function buildMeasurementPanel(selector, measurementData, palette, opts) {
  const node = document.querySelector(selector);
  const w = node.clientWidth || 220;
  const h = node.clientHeight || 130;
  const inner = { w: w - MARGIN.left - MARGIN.right, h: h - MARGIN.top - MARGIN.bottom };
  const svg = makeSvg(selector, w, h);
  if (opts.greyBg) {
    svg.append("rect").attr("x", MARGIN.left).attr("y", MARGIN.top)
      .attr("width", inner.w).attr("height", inner.h)
      .attr("fill", STD_PANEL_BG).attr("stroke", "none");
  }
  const g = svg.append("g").attr("transform", `translate(${MARGIN.left}, ${MARGIN.top})`);

  const x = d3.scaleLinear().domain([2000, 2024]).range([0, inner.w]);
  const y = d3.scaleLinear().domain(opts.yLim).range([inner.h, 0]);

  g.append("g")
    .attr("transform", `translate(0, ${inner.h})`)
    .call(d3.axisBottom(x).tickValues([2000, 2010, 2020]).tickFormat(d3.format("d")).tickSizeInner(3).tickSizeOuter(0))
    .call(styleAxis);
  g.append("g")
    .call(d3.axisLeft(y).ticks(3).tickFormat(d3.format(".1~f")).tickSizeInner(3).tickSizeOuter(0))
    .call(styleAxis);

  // Optional zero reference line (useful for skewness).
  if (opts.zeroLine) {
    g.append("line")
      .attr("x1", 0).attr("x2", inner.w)
      .attr("y1", y(0)).attr("y2", y(0))
      .attr("stroke", "#999").attr("stroke-width", 0.5)
      .attr("stroke-dasharray", "2 2");
  }

  const valueKey = opts.valueKey;
  const semKey = opts.semKey;
  const bandLoKey = opts.bandLoKey;
  const bandHiKey = opts.bandHiKey;

  palette.event_order.forEach((event) => {
    const color = palette.event[event];
    const arr = (measurementData[event] || []).filter((d) => Number.isFinite(d[valueKey]));
    if (!arr.length) return;

    if (semKey) {
      const band = d3.area()
        .defined((d) => Number.isFinite(d[valueKey]) && Number.isFinite(d[semKey]))
        .x((d) => x(d.year))
        .y0((d) => y(d[valueKey] - d[semKey]))
        .y1((d) => y(d[valueKey] + d[semKey]));
      g.append("path").datum(arr).attr("fill", color).attr("opacity", 0.18).attr("d", band);
    } else if (bandLoKey) {
      const band = d3.area()
        .defined((d) => Number.isFinite(d[bandLoKey]) && Number.isFinite(d[bandHiKey]))
        .x((d) => x(d.year))
        .y0((d) => y(d[bandLoKey]))
        .y1((d) => y(d[bandHiKey]));
      g.append("path").datum(arr).attr("fill", color).attr("opacity", 0.18).attr("d", band);
    }

    const line = d3.line()
      .defined((d) => Number.isFinite(d[valueKey]))
      .x((d) => x(d.year))
      .y((d) => y(d[valueKey]));
    g.append("path").datum(arr)
      .attr("fill", "none").attr("stroke", color)
      .attr("stroke-width", event === "fashion_shows" ? 1.2 : 1.0)
      .attr("d", line);
  });

  panelLabel(svg, opts.label, w);
  const yearLine = g.append("line")
    .attr("y1", 0).attr("y2", inner.h)
    .attr("stroke", INK).attr("stroke-width", 1).attr("stroke-dasharray", "2 2")
    .attr("pointer-events", "none");

  return { update(year) { yearLine.attr("x1", x(year)).attr("x2", x(year)); } };
}

/* ---------- Tails: P10/P25/P50/P75/P90 envelope for one measurement (paper body_tails) ---------- */
function buildTailsPanel(selector, tailsForEvent, measurement, label, opts) {
  // tailsForEvent[measurement] = [{year, p10, p25, p50, p75, p90, p95, p99}]
  const node = document.querySelector(selector);
  const w = node.clientWidth || 220;
  const h = node.clientHeight || 140;
  const inner = { w: w - MARGIN.left - MARGIN.right, h: h - MARGIN.top - MARGIN.bottom };
  const svg = makeSvg(selector, w, h);
  const g = svg.append("g").attr("transform", `translate(${MARGIN.left}, ${MARGIN.top})`);

  const arr = (tailsForEvent[measurement] || []).filter((d) => Number.isFinite(d.p50));
  if (!arr.length) return { update() {} };

  const x = d3.scaleLinear().domain([2000, 2024]).range([0, inner.w]);
  const allVals = arr.flatMap((d) => [d.p10, d.p25, d.p50, d.p75, d.p90]).filter(Number.isFinite);
  const yExt = d3.extent(allVals);
  const yPad = (yExt[1] - yExt[0]) * 0.06 || 1;
  const y = d3.scaleLinear().domain([yExt[0] - yPad, yExt[1] + yPad]).nice().range([inner.h, 0]);

  g.append("g").attr("transform", `translate(0, ${inner.h})`)
    .call(d3.axisBottom(x).tickValues([2000, 2010, 2020]).tickFormat(d3.format("d")).tickSizeInner(3).tickSizeOuter(0))
    .call(styleAxis);
  g.append("g").call(d3.axisLeft(y).ticks(3).tickFormat(d3.format(".1~f")).tickSizeInner(3).tickSizeOuter(0)).call(styleAxis);

  const color = "#07AB92";
  const bands = [
    { lo: "p10", hi: "p90", alpha: 0.10 },
    { lo: "p25", hi: "p75", alpha: 0.22 },
  ];
  bands.forEach(({ lo, hi, alpha }) => {
    const band = d3.area()
      .defined((d) => Number.isFinite(d[lo]) && Number.isFinite(d[hi]))
      .x((d) => x(d.year))
      .y0((d) => y(d[lo]))
      .y1((d) => y(d[hi]));
    g.append("path").datum(arr).attr("fill", color).attr("opacity", alpha).attr("d", band);
  });
  const line = d3.line()
    .defined((d) => Number.isFinite(d.p50))
    .x((d) => x(d.year)).y((d) => y(d.p50));
  g.append("path").datum(arr).attr("fill", "none").attr("stroke", color).attr("stroke-width", 1.2).attr("d", line);

  panelLabel(svg, label, w);
  const yearLine = g.append("line").attr("y1", 0).attr("y2", inner.h)
    .attr("stroke", INK).attr("stroke-width", 1).attr("stroke-dasharray", "2 2");

  // Invisible click regions: top third = biggest, middle = middle, bottom = smallest.
  const variable = opts && opts.variable;
  if (variable) {
    const tooltip = document.getElementById("tooltip");
    const regions = [
      { value: "high", y0: 0, y1: inner.h / 3, hint: "high RFM" },
      { value: "mid",  y0: inner.h / 3, y1: (2 * inner.h) / 3, hint: "mid RFM" },
      { value: "low",  y0: (2 * inner.h) / 3, y1: inner.h, hint: "low RFM" },
    ];
    regions.forEach((r) => {
      g.append("rect")
        .attr("x", 0).attr("y", r.y0)
        .attr("width", inner.w).attr("height", r.y1 - r.y0)
        .attr("fill", "transparent")
        .style("cursor", "pointer")
        .on("mouseenter", function (event) {
          tooltip.textContent = `Click ${r.hint} to filter mosaic`;
          tooltip.classList.add("show");
          tooltip.style.left = `${event.clientX}px`;
          tooltip.style.top = `${event.clientY - 8}px`;
        })
        .on("mousemove", function (event) {
          tooltip.style.left = `${event.clientX}px`;
          tooltip.style.top = `${event.clientY - 8}px`;
        })
        .on("mouseleave", function () {
          tooltip.classList.remove("show");
        })
        .on("click", function (event) {
          event.stopPropagation();
          window.dispatchEvent(new CustomEvent("dashboard:filter", {
            detail: { variable, value: r.value },
          }));
        });
    });
  }

  return { update(year) { yearLine.attr("x1", x(year)).attr("x2", x(year)); } };
}

/* ---------- Categorical stacked bars (paper style) ---------- */
function buildStackedBarsPanel(selector, perYear, palette, opts) {
  // perYear: {year: {value: proportion}}
  // palette: {value: hex} (ordered)
  const node = document.querySelector(selector);
  const w = node.clientWidth || 220;
  const h = node.clientHeight || 130;
  const inner = { w: w - MARGIN.left - MARGIN.right, h: h - MARGIN.top - MARGIN.bottom };
  const svg = makeSvg(selector, w, h);
  const g = svg.append("g").attr("transform", `translate(${MARGIN.left}, ${MARGIN.top})`);

  const years = Object.keys(perYear).map(Number).sort((a, b) => a - b);
  if (!years.length) return { update() {} };

  const orderedKeys = Object.keys(palette);
  // Normalize per year so totals = 1.
  const norm = {};
  years.forEach((y) => {
    const row = perYear[y] || {};
    const total = Object.values(row).reduce((s, v) => s + (v || 0), 0) || 1;
    norm[y] = {};
    orderedKeys.forEach((k) => { norm[y][k] = (row[k] || 0) / total; });
  });

  const x = d3.scaleLinear().domain([2000 - 0.5, 2024 + 0.5]).range([0, inner.w]);
  const barW = inner.w / 25;
  const y = d3.scaleLinear().domain([0, 1]).range([inner.h, 0]);

  // Draw stacks year-by-year so bars are width=1-year and stack bottom→top following palette order.
  // To preserve paper "reversed for stacking" behaviour, iterate orderedKeys in reverse.
  const drawOrder = orderedKeys.slice().reverse();
  const tooltip = document.getElementById("tooltip");
  const variable = opts.variable; // 'hair' | 'eyes' | 'region'
  years.forEach((yr) => {
    let bottom = 0;
    drawOrder.forEach((k) => {
      const v = norm[yr][k] || 0;
      if (v <= 0) return;
      const rect = g.append("rect")
        .attr("x", x(yr - 0.5))
        .attr("y", y(bottom + v))
        .attr("width", barW)
        .attr("height", y(bottom) - y(bottom + v))
        .attr("fill", palette[k])
        .attr("stroke", "none")
        .attr("data-label", k)
        .attr("data-year", yr)
        .attr("data-prop", v)
        .style("cursor", "pointer");
      rect.on("mouseenter", function (event) {
        const pct = (v * 100).toFixed(1);
        tooltip.textContent = `${k} · ${yr} · ${pct}% — click to filter mosaic`;
        tooltip.classList.add("show");
        tooltip.style.left = `${event.clientX}px`;
        tooltip.style.top = `${event.clientY - 8}px`;
      }).on("mousemove", function (event) {
        tooltip.style.left = `${event.clientX}px`;
        tooltip.style.top = `${event.clientY - 8}px`;
      }).on("mouseleave", function () {
        tooltip.classList.remove("show");
      }).on("click", function (event) {
        event.stopPropagation();
        if (!variable) return;
        window.dispatchEvent(new CustomEvent("dashboard:filter", {
          detail: { variable, value: k },
        }));
      });
      bottom += v;
    });
  });

  g.append("g").attr("transform", `translate(0, ${inner.h})`)
    .call(d3.axisBottom(x).tickValues([2000, 2010, 2020]).tickFormat(d3.format("d")).tickSizeInner(3).tickSizeOuter(0))
    .call(styleAxis);
  // y-axis without the 100% top label
  g.append("g")
    .call(d3.axisLeft(y).tickValues([0, 0.25, 0.5, 0.75]).tickFormat(d3.format(".0%")).tickSizeInner(3).tickSizeOuter(0))
    .call(styleAxis);

  panelLabel(svg, opts.label, w);
  const yearLine = g.append("line").attr("y1", 0).attr("y2", inner.h)
    .attr("stroke", INK).attr("stroke-width", 1).attr("stroke-dasharray", "2 2");
  return { update(yr) { yearLine.attr("x1", x(yr)).attr("x2", x(yr)); } };
}

/* ---------- Share of non-white models per year ---------- */
function buildNonWhiteSharePanel(selector, mosaicData) {
  const node = document.querySelector(selector);
  const w = node.clientWidth || 220;
  const h = node.clientHeight || 130;
  const inner = { w: w - MARGIN.left - MARGIN.right, h: h - MARGIN.top - MARGIN.bottom };
  const svg = makeSvg(selector, w, h);
  const g = svg.append("g").attr("transform", `translate(${MARGIN.left}, ${MARGIN.top})`);

  const series = Object.keys(mosaicData)
    .map((k) => ({ year: +k, share: 1 - (mosaicData[k]?.target?.pct_W ?? NaN) }))
    .filter((d) => Number.isFinite(d.share))
    .sort((a, b) => a.year - b.year);

  const x = d3.scaleLinear().domain([2000, 2024]).range([0, inner.w]);
  const yMax = Math.max(0.05, d3.max(series, (d) => d.share));
  const y = d3.scaleLinear().domain([0, yMax * 1.1]).range([inner.h, 0]);

  g.append("g").attr("transform", `translate(0, ${inner.h})`)
    .call(d3.axisBottom(x).tickValues([2000, 2010, 2020]).tickFormat(d3.format("d")).tickSizeInner(3).tickSizeOuter(0))
    .call(styleAxis);
  g.append("g").call(d3.axisLeft(y).ticks(3).tickFormat(d3.format(".0%")).tickSizeInner(3).tickSizeOuter(0)).call(styleAxis);

  // Invisible click regions: above the line → white, below the line → non-white.
  // (The y-axis tracks the share of non-white, so the area below the curve maps to non-white.)
  const tooltip = document.getElementById("tooltip");
  const aboveArea = d3.area()
    .x((d) => x(d.year))
    .y0(() => 0)
    .y1((d) => y(d.share));
  const belowArea = d3.area()
    .x((d) => x(d.year))
    .y0((d) => y(d.share))
    .y1(() => inner.h);
  const regions = [
    { value: "W",  path: aboveArea, hint: "above (white models)" },
    { value: "NW", path: belowArea, hint: "below (non-white models)" },
  ];
  regions.forEach((r) => {
    g.append("path")
      .datum(series)
      .attr("d", r.path)
      .attr("fill", "transparent")
      .style("cursor", "pointer")
      .on("mouseenter", function (event) {
        tooltip.textContent = `Click ${r.hint} to filter mosaic`;
        tooltip.classList.add("show");
        tooltip.style.left = `${event.clientX}px`;
        tooltip.style.top = `${event.clientY - 8}px`;
      })
      .on("mousemove", function (event) {
        tooltip.style.left = `${event.clientX}px`;
        tooltip.style.top = `${event.clientY - 8}px`;
      })
      .on("mouseleave", function () {
        tooltip.classList.remove("show");
      })
      .on("click", function (event) {
        event.stopPropagation();
        window.dispatchEvent(new CustomEvent("dashboard:filter", {
          detail: { variable: "ethn", value: r.value },
        }));
      });
  });

  const color = "#61C2FF";
  const line = d3.line().x((d) => x(d.year)).y((d) => y(d.share));
  g.append("path").datum(series)
    .attr("fill", "none").attr("stroke", color).attr("stroke-width", 1.4)
    .attr("pointer-events", "none")
    .attr("d", line);
  g.selectAll(null).data(series).enter().append("circle")
    .attr("cx", (d) => x(d.year)).attr("cy", (d) => y(d.share))
    .attr("r", 1.4).attr("fill", color)
    .attr("pointer-events", "none");

  panelLabel(svg, "Share of non-white models", w);
  const yearLine = g.append("line").attr("y1", 0).attr("y2", inner.h)
    .attr("stroke", INK).attr("stroke-width", 1).attr("stroke-dasharray", "2 2")
    .attr("pointer-events", "none");
  return { update(year) { yearLine.attr("x1", x(year)).attr("x2", x(year)); } };
}
