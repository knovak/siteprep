#!/usr/bin/env python3
"""Extract reviewed FES2022 harmonic points through the official PyFES engine."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
from pathlib import Path

import numpy
import pyfes


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("plan", type=Path)
    parser.add_argument("config", type=Path)
    parser.add_argument("atlas", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    return parser.parse_args()


def load_json(path: Path) -> dict:
    with path.open(encoding="utf-8") as source:
        return json.load(source)


def validate_plan(plan: dict) -> list[dict]:
    if plan.get("schema") != "tide-here/fes-extraction-plan/v1":
        raise ValueError("Unsupported FES extraction plan")
    points = [point for tile in plan.get("tiles", []) for point in tile.get("points", [])]
    if not points:
        raise ValueError("FES extraction plan has no points")
    for point in points:
        for field in ("id", "name", "latitude", "longitude", "timeZone", "maximumDistanceKm"):
            if field not in point:
                raise ValueError(f"FES extraction point is missing {field}")
    return points


def bounding_box(points: list[dict], padding_degrees: float = 0.5) -> tuple[float, float, float, float]:
    longitudes = [float(point["longitude"]) for point in points]
    latitudes = [float(point["latitude"]) for point in points]
    if max(longitudes) - min(longitudes) > 180:
        raise ValueError("One extraction must not cross the antimeridian")
    return (
        min(longitudes) - padding_degrees,
        min(latitudes) - padding_degrees,
        max(longitudes) + padding_degrees,
        max(latitudes) + padding_degrees,
    )


def constituent(name: str, value: complex) -> dict:
    amplitude = abs(value)
    phase = math.degrees(math.atan2(value.imag, value.real)) % 360
    if not math.isfinite(amplitude) or not math.isfinite(phase):
        raise ValueError(f"FES interpolation returned an invalid {name} constituent")
    return {"name": name.upper(), "amplitude": round(amplitude, 6), "phase": round(phase, 6)}


def round_trip_error(configuration, model, point: dict, constituents: list[dict]) -> float:
    dates = numpy.arange(
        numpy.datetime64("2026-01-01T00:00:00"),
        numpy.datetime64("2026-01-02T01:00:00"),
        numpy.timedelta64(1, "h"),
    )
    longitudes = numpy.full(dates.size, point["longitude"], dtype=numpy.float64)
    latitudes = numpy.full(dates.size, point["latitude"], dtype=numpy.float64)
    atlas_tide, atlas_long_period, flags = pyfes.evaluate_tide(
        model,
        dates,
        longitudes,
        latitudes,
        settings=configuration.settings,
    )
    if numpy.any(flags == 0):
        raise ValueError(f"FES2022 round-trip is undefined for {point['id']}")
    known = {item["name"]: (item["amplitude"], item["phase"]) for item in constituents}
    known_tide, known_long_period = pyfes.evaluate_tide_from_constituents(
        known,
        dates,
        float(point["latitude"]),
        settings=configuration.settings,
    )
    maximum = float(numpy.max(numpy.abs(
        (atlas_tide + atlas_long_period) - (known_tide + known_long_period)
    )))
    if not math.isfinite(maximum) or maximum > 0.01:
        raise ValueError(f"FES2022 constituent round-trip failed for {point['id']}: {maximum} cm")
    return round(maximum, 6)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        while chunk := source.read(8 * 1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def extract_tile(config: Path, tile: dict) -> dict:
    points = tile["points"]
    configuration = pyfes.config.load(config, bbox=bounding_box(points))
    model = configuration.models["tide"]
    longitudes = numpy.array([point["longitude"] for point in points], dtype=numpy.float64)
    latitudes = numpy.array([point["latitude"] for point in points], dtype=numpy.float64)
    values, quality = model.interpolate(longitudes, latitudes)
    identifiers = model.identifiers()
    if len(identifiers) != 34:
        raise ValueError(f"Expected 34 FES2022 constituents, received {len(identifiers)}")

    extracted = []
    for index, point in enumerate(points):
        quality_value = int(quality[index])
        if quality_value == 0:
            raise ValueError(f"FES2022 does not cover {point['id']}")
        constituents = [constituent(name, values[name][index]) for name in identifiers]
        extracted.append({
            **point,
            "datum": "FES2022 mean sea level harmonic datum",
            "units": "cm",
            "water": True,
            "interpolationQuality": quality_value,
            "interpolationMethod": "interpolated" if quality_value > 0 else "extrapolated",
            "constituentRoundTripMaxErrorCm": round_trip_error(configuration, model, point, constituents),
            "constituents": constituents,
        })
    return {**tile, "points": extracted}


def main() -> None:
    args = arguments()
    plan = load_json(args.plan)
    points = validate_plan(plan)
    if not args.atlas.is_file():
        raise FileNotFoundError(args.atlas)

    os.environ["FES2022_NS_GRID"] = str(args.atlas.resolve())
    result = {
        "schema": "tide-here/fes-source-extract/v1",
        "dataset": {
            **plan["dataset"],
            "sourceFiles": [{
                "name": args.atlas.name,
                "bytes": args.atlas.stat().st_size,
                "sha256": sha256(args.atlas),
            }],
        },
        "tiles": [extract_tile(args.config, tile) for tile in plan["tiles"]],
    }
    args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
