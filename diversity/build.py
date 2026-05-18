#!/usr/bin/env python
"""
Build script for the Diversity 2026 dashboard.

Generates:
    data/mosaic_index.json        100 image tiles/year, restricted to canonical models_rfm_female.csv
    data/measurements.json        mean / std / n / sem / std-CI per event x measurement x year
    data/categorical.json         hair/eyes/world_region proportions per event x year (paper color maps)
    data/tails.json               body-measurement quantiles (p10..p99) per measurement x year (paper body_tails)
    data/moments.json             IQR / skewness / kurtosis per event x measurement x year (paper outliers)
    data/entropy.json             Shannon entropy per event x variable x year
    data/intersectionality.json   race x year predicted_prob + 95% CI + observed plus-sized share
    data/palette.json             paper color maps for hair/eyes/region
    img/{year}/{i}.webp           100 tiles x 25 years
"""

import json
import math
import shutil
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from PIL import Image
from scipy.stats import chi2

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
IMG_DIR = ROOT / "img"

PAIRS_PARQUET = Path("/home/louibo/diversity_measurement/data/pairs_v1.parquet")
DS_DATA = Path("/work/louibo/diversity_2026/data_sharing/data")
MODEL_ATTRS_CSV = Path("/work/louibo/diversity_2026/data/models_measure_with_gender_metrics_quality_enhanced.csv")
NATIONALITY_CSV = Path("/work/louibo/diversity_2026/data/models_nationality.csv")

# Import nationality→region mapping from sibling module
sys.path.insert(0, str(ROOT.parent))
from data_nation_mapping import build_nationality_to_region  # noqa: E402

YEAR_MIN, YEAR_MAX = 2000, 2024
TILES_PER_YEAR = 126
TILE_W, TILE_H = 160, 240
ASPECT_TOL = 0.05
SEED = 42

# Paper palettes (lifted from data_sharing/scripts/measurement_evolution_plots.py and intersectionality_panel.py).
HAIR_COLOR_MAP = {
    "black": "#2F2F2F",
    "dark brown": "#654321",
    "brown": "#8B4513",
    "chestnut": "#954535",
    "auburn": "#A0522D",
    "red": "#CF7302",
    "grey": "#808080",
    "light brown": "#C39C39",
    "dark blonde": "#D5AB50",
    "blonde red": "#CD853F",
    "blonde": "#F4E28C",
    "light blonde": "#FFF8DC",
    "bald": "#E6E6FA",
    "white": "#F5F5F5",
}
HAIR_REMAP = {
    "red / brown": "auburn", "brown / red": "auburn", "auburn": "auburn",
    "red / blonde": "blonde red", "red blonde": "blonde red",
    "blonde / red": "blonde red", "light red": "blonde red",
}
EYE_COLOR_MAP = {
    "black": "#2F2F2F",
    "dark brown": "#654321",
    "blue / brown": "#483D8B",
    "brown": "#8B4513",
    "brown / hazel": "#8B7355",
    "light brown": "#D2B48C",
    "hazel": "#8E7618",
    "green / grey": "#2F4F4F",
    "green / brown": "#556B2F",
    "brown / green": "#556B2F",
    "green / hazel": "#6B8E23",
    "green": "#228B22",
    "blue / green": "#008B8B",
    "blue": "#4169E1",
    "blue / grey": "#6495ED",
    "grey": "#708090",
}
EYE_REMAP = {
    "brown / green": "brown / green", "green / brown": "brown / green",
    "dark green": "green / grey",
}
REGION_COLOR_MAP = {
    "southeast asia": "#FF7DBE",
    "south asia": "#F1C40F",
    "middle east": "#8E44AD",
    "north africa": "#E67E22",
    "sub-saharan africa": "#840202",
    "oceania": "#3498DB",
    "central asia": "#9B59B6",
    "east asia": "#91F378",
    "caribbean": "#F0F338",
    "central america": "#C12ECC",
    "south america": "#07AB92",
    "northern europe": "#3FACEF",
    "southern europe": "#EF970A",
    "north america": "#D81F1F",
    "western europe": "#0512A3",
    "eastern europe": "#22B2F5",
}

# Paper "individual" mode event colors.
EVENT_COLORS = {
    "fashion_shows": "#07AB92",
    "advertisements": "#FF7DBE",
    "magazine_covers": "#61C2FF",
    "editorials": "#8E44AD",
}
EVENT_ORDER = ["fashion_shows", "advertisements", "magazine_covers", "editorials"]

MEASUREMENTS = ["height_cm", "bust-eu_clean", "waist-eu_clean", "hips-eu_clean", "rfm"]
MEASUREMENT_LABELS = {
    "height_cm": "Height (cm)",
    "bust-eu_clean": "Bust (cm)",
    "waist-eu_clean": "Waist (cm)",
    "hips-eu_clean": "Hips (cm)",
    "rfm": "RFM index",
}
Y_LIMS = {
    "height_cm": [174.7, 181],
    "bust-eu_clean": [78.5, 88],
    "waist-eu_clean": [58.5, 63],
    "hips-eu_clean": [85.5, 91],
    "rfm": [14.5, 20],
}
STD_Y_LIM = [1.3, 5.8]


def log(msg):
    print(f"[build] {msg}", flush=True)


# -------------------- mosaic --------------------

def load_canonical_names():
    df = pd.read_csv(DS_DATA / "models_rfm_female.csv")
    return set(df["name"].str.strip())


def _str(v):
    if v is None or (isinstance(v, float) and not (v == v)):  # NaN check
        return ""
    return str(v)


def hair_bucket(v):
    s = _str(v).lower()
    if "blonde" in s: return "blonde"
    if "brown" in s or "chestnut" in s or "auburn" in s: return "brown"
    if "black" in s: return "black"
    if "red" in s: return "red"
    if "grey" in s or "white" in s: return "grey"
    return "other"


def eye_bucket(v):
    s = _str(v).lower()
    if "blue" in s: return "blue"
    if "hazel" in s: return "hazel"
    if "green" in s: return "green"
    if "brown" in s: return "brown"
    if "grey" in s or "black" in s or "amber" in s: return "grey"
    return "other"


def region_key(v):
    return _str(v).strip().lower() or "unknown"


def load_name_region_map():
    """name -> lowercased world region, via models_nationality.csv + nationality→region map.
    Used to override the per-row world_region from the parquet (which is broken for
    the canonical model pool — every canonical name is mislabelled North America)."""
    nat_to_region = build_nationality_to_region()
    df = pd.read_csv(NATIONALITY_CSV, usecols=["name", "nationality"]).dropna(subset=["name"])
    df["region"] = df["nationality"].map(nat_to_region).fillna("").str.lower()
    df = df[df["region"] != ""]
    return dict(zip(df["name"], df["region"]))


def load_model_attrs():
    df = pd.read_csv(MODEL_ATTRS_CSV, usecols=["model_id", "hair", "eyes"])
    df = df.drop_duplicates("model_id", keep="first")
    df["hair_b"] = df["hair"].map(hair_bucket)
    df["eye_b"] = df["eyes"].map(eye_bucket)
    return df[["model_id", "hair_b", "eye_b"]]


def load_pairs(canonical_names):
    """Return two DataFrames: canonical (paper-list models only) and broad (all female)."""
    p = pd.read_parquet(PAIRS_PARQUET)
    base = (
        (p.year >= YEAR_MIN)
        & (p.year <= YEAR_MAX)
        & (p.consensus_gender == "female")
        & (p.ethnicity_binary.isin(["W", "non_W"]))
        & p.rfm.notna()
        & p.local_path.notna()
    )
    broad = p.loc[base].copy()
    ar = broad["width"] / broad["height"]
    broad = broad[(ar - 2 / 3).abs() <= ASPECT_TOL]
    # Attach hair / eye buckets from model attrs CSV.
    attrs = load_model_attrs()
    broad = broad.merge(attrs, on="model_id", how="left")
    broad["hair_b"] = broad["hair_b"].fillna("other")
    broad["eye_b"] = broad["eye_b"].fillna("other")
    broad["region"] = broad["world_region"].map(region_key)
    canonical = broad[broad.name.isin(canonical_names)].copy()
    log(f"broad pairs rows usable: {len(broad)} | canonical subset: {len(canonical)}")
    return canonical, broad


def pick_nearest_rfm(stratum, target_rfms):
    """Pick one row from stratum per target RFM (nearest match). No replacement unless pool too small."""
    n = len(target_rfms)
    if n <= 0:
        return stratum.iloc[0:0]
    if len(stratum) == 0:
        return stratum
    s = stratum.sort_values("rfm").reset_index(drop=True)
    sorted_rfm = s.rfm.values
    used = np.zeros(len(s), dtype=bool)
    allow_repeats = len(s) < n
    out_rows = []
    for t in target_rfms:
        if allow_repeats:
            i = int(np.argmin(np.abs(sorted_rfm - t)))
        else:
            dist = np.where(used, np.inf, np.abs(sorted_rfm - t))
            i = int(np.argmin(dist))
            used[i] = True
        out_rows.append(s.iloc[i])
    return pd.DataFrame(out_rows).reset_index(drop=True)


def select_year_tiles(year_df):
    """
    Pick TILES_PER_YEAR rows so the sample reproduces the YEAR pool's RFM percentiles
    (p10/p50/p90 etc.) AND its W vs non_W ratio (within 1/n granularity).

    Strategy: shared year-wide RFM quantile targets, distributed proportionally to W and
    non_W. Each stratum picks rows nearest to its assigned year-wide quantile values.
    """
    deduped = (
        year_df.sample(frac=1, random_state=SEED)
        .drop_duplicates(subset=["model_slug"])
        .reset_index(drop=True)
    )
    pool = deduped if len(deduped) >= TILES_PER_YEAR else year_df.reset_index(drop=True)
    if len(pool) == 0:
        return pool.head(0)

    n = TILES_PER_YEAR
    pct_W = (pool.ethnicity_binary == "W").mean()
    target_W = int(round(n * pct_W))
    target_W = max(0, min(n, target_W))
    target_NW = n - target_W

    year_rfms = pool.rfm.values

    # Year-wide quantile targets for the n tiles overall.
    year_quants_all = (np.arange(n) + 0.5) / n
    year_rfm_all = np.quantile(year_rfms, year_quants_all)

    # Interleave assignments: largest_remainder-like split keeps W's chosen quantile
    # positions evenly distributed across the year's RFM range (not bunched at one end).
    if target_W > 0 and target_NW > 0:
        # Stride evenly through the n positions: roughly target_W chosen for W, rest NW.
        # Use rank-based: pick W at positions whose index*target_W/n rounds to a unique W slot.
        positions = np.arange(n)
        w_picks = np.round(np.linspace(0, n - 1, target_W)).astype(int)
        w_mask = np.zeros(n, dtype=bool)
        w_mask[np.unique(w_picks)] = True
        # If rounding lost some slots due to collisions, fill with first unused.
        deficit = target_W - int(w_mask.sum())
        if deficit > 0:
            free = np.where(~w_mask)[0]
            w_mask[free[:deficit]] = True
        w_target_rfms = year_rfm_all[w_mask]
        nw_target_rfms = year_rfm_all[~w_mask]
    elif target_W > 0:
        w_target_rfms = year_rfm_all
        nw_target_rfms = np.array([])
    else:
        w_target_rfms = np.array([])
        nw_target_rfms = year_rfm_all

    chosen_W = pick_nearest_rfm(pool[pool.ethnicity_binary == "W"], w_target_rfms)
    chosen_NW = pick_nearest_rfm(pool[pool.ethnicity_binary == "non_W"], nw_target_rfms)
    return pd.concat([chosen_W, chosen_NW]).sort_values("rfm").reset_index(drop=True)


def quantiles(s):
    if s.empty:
        return (float("nan"),) * 3
    q = s.quantile([0.10, 0.50, 0.90])
    return float(q.loc[0.10]), float(q.loc[0.50]), float(q.loc[0.90])


WATERMARK_CROP_FRAC = 0.10  # crop bottom 10% to remove watermark


def resize_tile(src, dst):
    with Image.open(src) as im:
        im = im.convert("RGB")
        w, h = im.size
        # Remove watermark band at the bottom.
        crop_bottom = int(h * (1 - WATERMARK_CROP_FRAC))
        im = im.crop((0, 0, w, crop_bottom))
        w, h = im.size
        tgt = TILE_W / TILE_H
        cur = w / h
        if cur > tgt:
            new_w = int(h * tgt)
            left = (w - new_w) // 2
            im = im.crop((left, 0, left + new_w, h))
        elif cur < tgt:
            new_h = int(w / tgt)
            # Bias the crop toward the top of the frame (face/upper-body) rather than centre.
            top = int((h - new_h) * 0.15)
            im = im.crop((0, top, w, top + new_h))
        im = im.resize((TILE_W, TILE_H), Image.LANCZOS)
        dst.parent.mkdir(parents=True, exist_ok=True)
        im.save(dst, "webp", quality=82, method=4)


def build_mosaic(canonical_pairs, broad_pairs, name_region=None):
    name_region = name_region or {}
    mosaic = {}
    if IMG_DIR.exists():
        shutil.rmtree(IMG_DIR)
    for year in range(YEAR_MIN, YEAR_MAX + 1):
        # Always use the broad pool — the canonical list (models_rfm_female.csv) is
        # biased toward American models, which produced all-North-America tiles for
        # years where the canonical pool was large enough to be used exclusively.
        broad_year = broad_pairs[broad_pairs.year == year]
        year_df = broad_year
        pool_source = "broad"
        if year_df.empty:
            log(f"year {year}: no rows, skipping")
            continue
        chosen = select_year_tiles(year_df)
        tw_target = (year_df.ethnicity_binary == "W").mean()
        ty10, ty50, ty90 = quantiles(year_df.rfm)
        ay10, ay50, ay90 = quantiles(chosen.rfm)
        aW = (chosen.ethnicity_binary == "W").mean() if len(chosen) else 0
        tiles = []
        for i, row in enumerate(chosen.itertuples(index=False)):
            dst = IMG_DIR / str(year) / f"{i}.webp"
            try:
                resize_tile(Path(row.local_path), dst)
            except Exception as e:
                log(f"year {year} tile {i}: {e}")
                continue
            row_region = getattr(row, "region", "unknown") or "unknown"
            tiles.append({
                "img": f"img/{year}/{i}.webp",
                "rfm": round(float(row.rfm), 2),
                "ethn": row.ethnicity_binary,
                "name": row.name,
                "brand": row.brand,
                "hair_b": getattr(row, "hair_b", "other") or "other",
                "eye_b": getattr(row, "eye_b", "other") or "other",
                "region": name_region.get(row.name, row_region),
            })
        mosaic[str(year)] = {
            "tiles": tiles,
            "target": {"pct_W": round(float(tw_target), 4), "q10": round(ty10, 3), "q50": round(ty50, 3), "q90": round(ty90, 3)},
            "actual": {"pct_W": round(float(aW), 4), "q10": round(ay10, 3), "q50": round(ay50, 3), "q90": round(ay90, 3)},
            "pool_size": int(len(year_df)),
            "unique_pool_size": int(year_df["model_slug"].nunique()),
            "pool_source": pool_source,
        }
        log(f"year {year}: {len(tiles)} tiles | pool={len(year_df)} ({pool_source}) | target W={tw_target:.2f}/q50={ty50:.2f} | actual W={aW:.2f}/q50={ay50:.2f}")
    return mosaic


# -------------------- measurements / categorical / tails / moments / entropy / inter --------------------

def std_ci_pair(s, n, alpha=0.05):
    if s is None or n is None or n < 3 or not np.isfinite(s) or s < 0:
        return None, None
    df = n - 1
    lo_q = chi2.ppf(alpha / 2, df)
    hi_q = chi2.ppf(1 - alpha / 2, df)
    if not (np.isfinite(lo_q) and np.isfinite(hi_q)) or lo_q <= 0 or hi_q <= 0:
        return None, None
    return math.sqrt(df * s * s / hi_q), math.sqrt(df * s * s / lo_q)


def build_measurements():
    df = pd.read_csv(DS_DATA / "measurement_evolution_female_eu_numeric.csv")
    df = df[(df.year >= YEAR_MIN) & (df.year <= YEAR_MAX)]
    out = {}
    for event in EVENT_ORDER:
        sub_evt = df[df.event == event]
        out[event] = {}
        for measurement in MEASUREMENTS:
            rows = sub_evt[sub_evt.measurement == measurement].sort_values("year")
            series = []
            for r in rows.itertuples(index=False):
                mean = r._asdict()["mean"] if False else getattr(r, "mean")
                # itertuples renames mean to _ if conflict; safer to use dict-cast via to_dict
                pass
            # Easier path with iterrows.
            for _, r in rows.iterrows():
                mean_v = float(r["mean"]) if pd.notna(r["mean"]) else None
                std_v = float(r["std"]) if pd.notna(r["std"]) else None
                n_v = int(r["n"]) if pd.notna(r["n"]) else None
                sem = std_v / math.sqrt(n_v) if (std_v is not None and n_v is not None and n_v > 1) else None
                std_lo, std_hi = std_ci_pair(std_v, n_v)
                series.append({
                    "year": int(r["year"]),
                    "mean": None if mean_v is None else round(mean_v, 3),
                    "std": None if std_v is None else round(std_v, 3),
                    "n": n_v,
                    "sem": None if sem is None else round(sem, 4),
                    "std_lo": None if std_lo is None else round(std_lo, 4),
                    "std_hi": None if std_hi is None else round(std_hi, 4),
                })
            out[event][measurement] = series
    return out


def build_categorical():
    """Hair / eye / world_region per year for fashion_shows event, normalized via paper remaps."""
    df = pd.read_csv(DS_DATA / "measurement_evolution_female_eu_categorical.csv")
    df = df[(df.event == "fashion_shows") & (df.year >= YEAR_MIN) & (df.year <= YEAR_MAX)]
    out = {"hair": {}, "eyes": {}, "world_region": {}}

    # Hair: apply paper remap then aggregate.
    hsub = df[df.variable == "hair"].copy()
    hsub["value"] = hsub["value"].map(HAIR_REMAP).fillna(hsub["value"])
    h_agg = hsub.groupby(["year", "value"])["proportion"].sum().reset_index()
    for year, sub in h_agg.groupby("year"):
        out["hair"][str(int(year))] = {row.value: round(float(row.proportion), 4) for row in sub.itertuples(index=False)}

    # Eyes.
    esub = df[df.variable == "eyes"].copy()
    esub["value"] = esub["value"].map(EYE_REMAP).fillna(esub["value"])
    e_agg = esub.groupby(["year", "value"])["proportion"].sum().reset_index()
    for year, sub in e_agg.groupby("year"):
        out["eyes"][str(int(year))] = {row.value: round(float(row.proportion), 4) for row in sub.itertuples(index=False)}

    # World region (already lowercased in source).
    rsub = df[df.variable == "world_region"].copy()
    rsub["value"] = rsub["value"].str.lower()
    r_agg = rsub.groupby(["year", "value"])["proportion"].sum().reset_index()
    for year, sub in r_agg.groupby("year"):
        out["world_region"][str(int(year))] = {row.value: round(float(row.proportion), 4) for row in sub.itertuples(index=False)}
    return out


def build_tails():
    df = pd.read_csv(DS_DATA / "body_tails_female_2000_2024.csv")
    df = df[(df.year >= YEAR_MIN) & (df.year <= YEAR_MAX)]
    quantile_cols = ["p10", "p25", "p50", "p75", "p90", "p95", "p99"]
    out = {}
    for (event, measurement), sub in df.groupby(["event", "measurement"]):
        sub = sub.sort_values("year")
        series = []
        for _, r in sub.iterrows():
            series.append({
                "year": int(r["year"]),
                **{q: round(float(r[q]), 3) for q in quantile_cols if pd.notna(r[q])},
                "n": int(r["count"]),
            })
        out.setdefault(event, {})[measurement] = series
    return out


def build_moments():
    df = pd.read_csv(DS_DATA / "outliers_female_eu_moments.csv")
    df = df[(df.year >= YEAR_MIN) & (df.year <= YEAR_MAX)]
    out = {}
    for (event, measurement), sub in df.groupby(["event", "measurement"]):
        sub = sub.sort_values("year")
        series = [{
            "year": int(r["year"]),
            "iqr": round(float(r["iqr"]), 4),
            "skewness": round(float(r["skewness"]), 4),
            "kurtosis": round(float(r["kurtosis"]), 4),
            "n": int(r["n"]),
        } for _, r in sub.iterrows()]
        out.setdefault(event, {})[measurement] = series
    return out


def build_entropy():
    df = pd.read_csv(DS_DATA / "entropy_evolution_female.csv")
    df = df[(df.year >= YEAR_MIN) & (df.year <= YEAR_MAX)]
    out = {}
    for (event, variable), sub in df.groupby(["event", "variable"]):
        sub = sub.sort_values("year")
        out.setdefault(event, {})[variable] = [
            {"year": int(r["year"]), "entropy": round(float(r["entropy"]), 4)} for _, r in sub.iterrows()
        ]
    return out


def build_intersectionality():
    pp = pd.read_csv(DS_DATA / "intersectionality_predicted_probabilities_race.csv")
    obs = pd.read_csv(DS_DATA / "intersectionality_temporal_by_race.csv")
    pp = pp[(pp.year >= YEAR_MIN) & (pp.year <= YEAR_MAX)]
    obs = obs[(obs.year >= YEAR_MIN) & (obs.year <= YEAR_MAX)]
    out = {}
    for _, r in pp.iterrows():
        out.setdefault(r["race"], []).append({
            "year": int(r["year"]),
            "predicted_prob": round(float(r["predicted_prob"]), 6),
            "ci_lo": round(float(r["ci_lower_95"]), 6),
            "ci_hi": round(float(r["ci_upper_95"]), 6),
        })
    obs_map = {}
    for _, r in obs.iterrows():
        obs_map.setdefault(r["race"], {})[int(r["year"])] = round(float(r["pct_plus_sized"]), 6)
    for race, series in out.items():
        for s in series:
            s["observed"] = obs_map.get(race, {}).get(s["year"])
        series.sort(key=lambda x: x["year"])
    return out


def write_json(name, payload):
    path = DATA_DIR / name
    path.write_text(json.dumps(payload, separators=(",", ":")))
    log(f"wrote {path.name} ({path.stat().st_size / 1024:.1f} KB)")


def main():
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    log("== mosaic ==")
    canonical = load_canonical_names()
    log(f"canonical female names: {len(canonical)}")
    canonical_pairs, broad_pairs = load_pairs(canonical)
    name_region = load_name_region_map()
    log(f"name→region map: {len(name_region)} entries")
    mosaic = build_mosaic(canonical_pairs, broad_pairs, name_region)
    write_json("mosaic_index.json", mosaic)

    log("== measurements ==")
    write_json("measurements.json", build_measurements())

    log("== categorical ==")
    write_json("categorical.json", build_categorical())

    log("== tails ==")
    write_json("tails.json", build_tails())

    log("== moments ==")
    write_json("moments.json", build_moments())

    log("== entropy ==")
    write_json("entropy.json", build_entropy())

    log("== intersectionality ==")
    write_json("intersectionality.json", build_intersectionality())

    log("== palette ==")
    write_json("palette.json", {
        "hair": HAIR_COLOR_MAP,
        "eyes": EYE_COLOR_MAP,
        "region": REGION_COLOR_MAP,
        "event": EVENT_COLORS,
        "event_order": EVENT_ORDER,
        "measurements": MEASUREMENTS,
        "measurement_labels": MEASUREMENT_LABELS,
        "y_lims": Y_LIMS,
        "std_y_lim": STD_Y_LIM,
    })

    log("done.")


if __name__ == "__main__":
    main()
