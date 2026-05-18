"""Rebuild mosaic tiles + JSON for a specific set of years using the (now broad) pool.
Used to fix the 2019/2020/2022 'all North America' bug without regenerating all 25 years."""
import json
import shutil
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
import build  # noqa: E402

YEARS_TO_FIX = [2019, 2020, 2022]

canonical_names = build.load_canonical_names()
canonical_pairs, broad_pairs = build.load_pairs(canonical_names)
name_region = build.load_name_region_map()
print(f"name→region: {len(name_region)} entries")

mosaic_path = build.DATA_DIR / "mosaic_index.json"
mosaic = json.loads(mosaic_path.read_text())

for year in YEARS_TO_FIX:
    year_df = broad_pairs[broad_pairs.year == year]
    if year_df.empty:
        print(f"year {year}: no rows, skipping")
        continue
    chosen = build.select_year_tiles(year_df)
    tw_target = (year_df.ethnicity_binary == "W").mean()
    ty10, ty50, ty90 = build.quantiles(year_df.rfm)
    ay10, ay50, ay90 = build.quantiles(chosen.rfm)
    aW = (chosen.ethnicity_binary == "W").mean() if len(chosen) else 0

    # Clear and rebuild this year's image directory
    year_dir = build.IMG_DIR / str(year)
    if year_dir.exists():
        shutil.rmtree(year_dir)

    tiles = []
    for i, row in enumerate(chosen.itertuples(index=False)):
        dst = year_dir / f"{i}.webp"
        try:
            build.resize_tile(Path(row.local_path), dst)
        except Exception as e:
            print(f"  year {year} tile {i}: {e}")
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
        "target": {"pct_W": round(float(tw_target), 4), "q10": round(ty10, 3),
                   "q50": round(ty50, 3), "q90": round(ty90, 3)},
        "actual": {"pct_W": round(float(aW), 4), "q10": round(ay10, 3),
                   "q50": round(ay50, 3), "q90": round(ay90, 3)},
        "pool_size": int(len(year_df)),
        "unique_pool_size": int(year_df["model_slug"].nunique()),
        "pool_source": "broad",
    }
    regions = pd.Series([t["region"] for t in tiles]).value_counts().head(6).to_dict()
    print(f"year {year}: {len(tiles)} tiles | regions={regions}")

mosaic_path.write_text(json.dumps(mosaic, separators=(",", ":")))
print(f"wrote {mosaic_path}")
