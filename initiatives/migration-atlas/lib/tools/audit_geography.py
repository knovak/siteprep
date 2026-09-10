#!/usr/bin/env python3
"""Describe endpoint containment in both bundled basemaps; do not certify T8."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess


ROOT = Path(__file__).resolve().parents[1]
INPUTS = (
    "data/migrations.json", "data/basemap/land110.json",
    "data/basemap/land50.json", "vendor_d3array.js", "vendor_d3geo.js",
)

# Use the same spherical containment implementation shipped with the atlas.
# The VM exposes neither application state nor a browser or network connection.
SCRIPT = """
const fs = require('node:fs');
const vm = require('node:vm');
const context = vm.createContext({});
for (const file of ['vendor_d3array.js', 'vendor_d3geo.js'])
  vm.runInContext(fs.readFileSync(file, 'utf8'), context);
const data = JSON.parse(fs.readFileSync('data/migrations.json', 'utf8'));
const maps = Object.fromEntries(['110', '50'].map(scale =>
  [scale, JSON.parse(fs.readFileSync(`data/basemap/land${scale}.json`, 'utf8'))]));
const rows = [];
for (const migration of data.migrations) {
  for (const [role, points] of [['source', [migration.source]],
                               ['destination', migration.destinations]]) {
    points.forEach((point, index) => rows.push({
      migration: migration.id, role, index: index + 1, name: point.name,
      lat: point.lat, lon: point.lon,
      inside_land110: context.d3.geoContains(maps['110'], [point.lon, point.lat]),
      inside_land50: context.d3.geoContains(maps['50'], [point.lon, point.lat]),
    }));
  }
}
process.stdout.write(JSON.stringify(rows));
"""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, help="JSON receipt; otherwise stdout")
    args = parser.parse_args()
    result = subprocess.run(["node", "-e", SCRIPT], cwd=ROOT,
                            check=True, capture_output=True, text=True)
    points = json.loads(result.stdout)
    report = {
        "method": "Vendored d3.geoContains at stored longitude/latitude, without rounding",
        "limits": "Polygon containment is not a settlement/source check, distance-to-land test or T8 acceptance. Coastline generalization can omit islands and coastal points. Scale names mean 1:110 million and 1:50 million, not metre precision.",
        "input_sha256": {name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest()
                         for name in INPUTS},
        "counts": {
            "points": len(points),
            "sources": sum(p["role"] == "source" for p in points),
            "destinations": sum(p["role"] == "destination" for p in points),
            "outside_land110": sum(not p["inside_land110"] for p in points),
            "outside_land50": sum(not p["inside_land50"] for p in points),
            "scale_disagreements": sum(p["inside_land110"] != p["inside_land50"]
                                       for p in points),
        },
        "points": points,
    }
    rendered = json.dumps(report, indent=2, ensure_ascii=False) + "\n"
    if args.output:
        args.output.write_text(rendered, encoding="utf-8")
    else:
        print(rendered, end="")


if __name__ == "__main__":
    main()
