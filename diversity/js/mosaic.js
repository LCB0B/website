/* Mosaic renderer — 18 cols × 7 rows = 126 tiles. Supports year + filter. */

function buildMosaic(selector, metaSelector, mosaicData) {
  const grid = document.querySelector(selector);
  const meta = document.querySelector(metaSelector);
  const tooltip = document.getElementById("tooltip");
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxCap = document.getElementById("lightbox-caption");
  if (lightbox && !lightbox.dataset.wired) {
    lightbox.dataset.wired = "1";
    const close = () => {
      lightbox.classList.remove("show");
      lightboxImg.src = "";
    };
    lightbox.addEventListener("click", close);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
  }
  grid.innerHTML = "";

  const TILE_COUNT = 126;
  const imgs = [];
  for (let i = 0; i < TILE_COUNT; i += 1) {
    const img = document.createElement("img");
    img.loading = "eager";
    img.decoding = "async";
    img.draggable = false;
    img.alt = "";
    img.addEventListener("mouseenter", () => {
      const t = img.dataset;
      if (!t.rfm || img.classList.contains("hidden")) return;
      tooltip.textContent = `RFM ${t.rfm} · ${t.ethn === "W" ? "white" : "non-white"}`;
      tooltip.classList.add("show");
      const r = img.getBoundingClientRect();
      tooltip.style.left = `${r.left + r.width / 2}px`;
      tooltip.style.top = `${r.top}px`;
    });
    img.addEventListener("mouseleave", () => tooltip.classList.remove("show"));
    img.addEventListener("click", (e) => {
      e.stopPropagation();
      const t = img.dataset;
      if (!t.rfm || !img.src || img.classList.contains("hidden")) return;
      const isOpen = lightbox.classList.contains("show");
      if (isOpen && lightboxImg.src.endsWith(img.src.split("/").pop())) {
        lightbox.classList.remove("show");
        lightboxImg.src = "";
        return;
      }
      lightboxImg.src = img.src;
      lightboxCap.textContent = `RFM ${t.rfm} · ${t.ethn === "W" ? "white" : "non-white"}`;
      lightbox.classList.add("show");
    });
    grid.appendChild(img);
    imgs.push(img);
  }

  const preloadCache = new Set();
  function preload(year) {
    [year - 1, year + 1].forEach((y) => {
      const key = String(y);
      const block = mosaicData[key];
      if (!block || preloadCache.has(key)) return;
      preloadCache.add(key);
      block.tiles.forEach((t) => {
        const im = new Image();
        im.src = t.img;
      });
    });
  }

  function tilesForYearFilter(year, filter) {
    const block = mosaicData[String(year)];
    if (!block) return { tiles: [], block: null };
    let tiles = block.tiles.slice();
    if (filter && filter.variable && filter.value) {
      const key = filter.variable === "hair" ? "hair_b"
                : filter.variable === "eyes" ? "eye_b"
                : filter.variable === "region" ? "region"
                : null;
      if (key) {
        tiles = tiles.filter((t) => (t[key] || "other") === filter.value);
      }
    }
    return { tiles, block };
  }

  let gen = 0;
  return {
    update(year, filter) {
      const g = ++gen;
      const { tiles, block } = tilesForYearFilter(year, filter);
      if (!block) return;
      imgs.forEach((img, i) => {
        const t = tiles[i];
        if (!t) {
          img.classList.add("hidden");
          img.removeAttribute("src");
          delete img.dataset.rfm;
          delete img.dataset.ethn;
          return;
        }
        img.classList.remove("hidden");
        img.src = t.img;
        img.dataset.rfm = t.rfm ?? "";
        img.dataset.ethn = t.ethn || "";
      });
      if (meta) {
        const a = block.actual;
        const showing = tiles.length;
        const filterNote = filter && filter.value
          ? ` <span style="margin-left:8px">Showing <strong>${showing}</strong> models</span>`
          : "";
        meta.innerHTML = `
          <span>RFM p10/p50/p90: <strong>${a.q10.toFixed(1)} / ${a.q50.toFixed(1)} / ${a.q90.toFixed(1)}</strong></span>
          <span>White share: <strong>${Math.round(a.pct_W * 100)}%</strong></span>
          ${filterNote}
        `;
      }
      if (g === gen) preload(year);
    },
    preloadAll() {
      const years = Object.keys(mosaicData).filter((k) => !preloadCache.has(k));
      const schedule = (cb) => (window.requestIdleCallback
        ? window.requestIdleCallback(cb, { timeout: 500 })
        : setTimeout(cb, 16));
      function next() {
        const y = years.shift();
        if (!y) return;
        preloadCache.add(y);
        mosaicData[y].tiles.forEach((t) => { const im = new Image(); im.src = t.img; });
        schedule(next);
      }
      schedule(next);
    },
  };
}
