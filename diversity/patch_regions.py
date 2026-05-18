"""Patch dashboard/data/mosaic_index.json — override each tile's `region`
using the nationality CSV + nationality→region mapping. Safe to re-run."""
import json
import sys
from collections import Counter
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parent))
from data_nation_mapping import build_nationality_to_region  # noqa: E402

MOSAIC = ROOT / "data" / "mosaic_index.json"
NAT_CSV = Path("/work/louibo/diversity_2026/data/models_nationality.csv")

nat_to_region = build_nationality_to_region()
df = pd.read_csv(NAT_CSV, usecols=["name", "nationality"]).dropna(subset=["name"])
df["region"] = df["nationality"].map(nat_to_region).fillna("").str.lower()
df = df[df["region"] != ""]
name_region = dict(zip(df["name"], df["region"]))
print(f"name→region entries: {len(name_region)}")

data = json.loads(MOSAIC.read_text())
changed = 0
unknown = 0
per_year_before = {}
per_year_after = {}
for y, block in data.items():
    before = Counter()
    after = Counter()
    for t in block["tiles"]:
        before[t.get("region", "unknown")] += 1
        new = name_region.get(t.get("name"))
        if new is None:
            unknown += 1
            after[t.get("region", "unknown")] += 1
            continue
        if new != t.get("region"):
            changed += 1
        t["region"] = new
        after[new] += 1
    per_year_before[y] = before
    per_year_after[y] = after

MOSAIC.write_text(json.dumps(data, separators=(",", ":")))
print(f"patched {changed} tile regions; {unknown} tiles had no nationality match (left as-is)")
for y in ["2014", "2018", "2020", "2022", "2024"]:
    if y in per_year_before:
        print(f"  {y}: before={dict(per_year_before[y].most_common(5))}")
        print(f"        after={dict(per_year_after[y].most_common(5))}")
