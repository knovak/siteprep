#!/usr/bin/env python3
"""Extract a resumable global coastal FES2022 package for protected R2 import."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
from pathlib import Path

import numpy
import pyfes


EXPECTED_ATLAS_BYTES = 3_953_139_340
EXPECTED_ATLAS_SHA256 = "6479dbd9acdfb63405ff15de1265154c4659b1f7112b8dfb1cabef945a481a23"


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("plan", type=Path)
    parser.add_argument("config", type=Path)
    parser.add_argument("atlas", type=Path)
    parser.add_argument("--output-directory", type=Path, required=True)
    return parser.parse_args()


def load_json(path: Path) -> dict:
    with path.open(encoding="utf-8") as source:
        return json.load(source)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        while chunk := source.read(8 * 1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def json_body(value: dict) -> str:
    return json.dumps(value, separators=(",", ":"), ensure_ascii=True)


def atomic_write(path: Path, body: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(body, encoding="utf-8")
    os.replace(temporary, path)


def object_name(tile_id: str) -> str:
    normalized = "tile-" + "".join(character if character.isalnum() else "-" for character in tile_id.lower())
    while "--" in normalized:
        normalized = normalized.replace("--", "-")
    return normalized.strip("-")


def constituent(name: str, value: complex) -> dict:
    amplitude = abs(value)
    phase = math.degrees(math.atan2(value.imag, value.real)) % 360
    if not math.isfinite(amplitude) or not math.isfinite(phase):
        raise ValueError(f"FES interpolation returned an invalid {name} constituent")
    return {"name": name.upper(), "amplitude": round(amplitude, 6), "phase": round(phase, 6)}


def round_trip_errors(configuration, model, points: list[dict]) -> list[float]:
    if not points:
        return []
    hourly_dates = numpy.arange(
        numpy.datetime64("2026-01-01T00:00:00"),
        numpy.datetime64("2026-01-02T01:00:00"),
        numpy.timedelta64(1, "h"),
    )
    dates = numpy.tile(hourly_dates, len(points))
    longitudes = numpy.repeat(
        numpy.array([point["longitude"] for point in points], dtype=numpy.float64),
        hourly_dates.size,
    )
    latitudes = numpy.repeat(
        numpy.array([point["latitude"] for point in points], dtype=numpy.float64),
        hourly_dates.size,
    )
    atlas_tide, atlas_long_period, flags = pyfes.evaluate_tide(
        model,
        dates,
        longitudes,
        latitudes,
        settings=configuration.settings,
    )
    atlas_total = atlas_tide + atlas_long_period
    errors = []
    for index, point in enumerate(points):
        start = index * hourly_dates.size
        end = start + hourly_dates.size
        if numpy.any(flags[start:end] == 0):
            raise ValueError(f"FES2022 round-trip is undefined for {point['id']}")
        known = {
            item["name"]: (item["amplitude"], item["phase"])
            for item in point["constituents"]
        }
        known_tide, known_long_period = pyfes.evaluate_tide_from_constituents(
            known,
            hourly_dates,
            float(point["latitude"]),
            settings=configuration.settings,
        )
        maximum = float(numpy.max(numpy.abs(
            atlas_total[start:end] - (known_tide + known_long_period)
        )))
        if not math.isfinite(maximum) or maximum > 0.01:
            raise ValueError(
                f"FES2022 constituent round-trip failed for {point['id']}: {maximum} cm"
            )
        errors.append(round(maximum, 6))
    return errors


def valid_existing(path: Path, dataset: dict, tile: dict) -> bool:
    if not path.is_file():
        return False
    try:
        existing = load_json(path)
    except (OSError, ValueError):
        return False
    existing_sampling = existing.get("dataset", {}).get("sampling", {})
    requested_sampling = dataset.get("sampling", {})
    return (
        existing.get("schema") == "tide-here/harmonic-tile/v1"
        and existing.get("dataset", {}).get("id") == dataset["id"]
        and existing.get("dataset", {}).get("version") == dataset["version"]
        and existing.get("tile", {}).get("id") == tile["id"]
        and all(
            existing_sampling.get(field) == requested_sampling.get(field)
            for field in ("spacingKm", "maximumSelectionDistanceKm", "tileDegrees", "sources")
        )
        and bool(existing.get("tile", {}).get("points"))
        and all(
            isinstance(point.get("constituentRoundTripMaxErrorCm"), (int, float))
            and math.isfinite(point["constituentRoundTripMaxErrorCm"])
            and 0 <= point["constituentRoundTripMaxErrorCm"] <= 0.01
            for point in existing.get("tile", {}).get("points", [])
        )
    )


def extract_tile(configuration, model, dataset: dict, source_tile: dict) -> dict:
    points = source_tile["points"]
    longitudes = numpy.array([point["longitude"] for point in points], dtype=numpy.float64)
    latitudes = numpy.array([point["latitude"] for point in points], dtype=numpy.float64)
    values, quality = model.interpolate(longitudes, latitudes)
    identifiers = list(model.identifiers())
    if len(identifiers) != 34:
        raise ValueError(f"Expected 34 FES2022 constituents, received {len(identifiers)}")
    extracted = []
    for index, point in enumerate(points):
        quality_value = int(quality[index])
        if quality_value == 0:
            continue
        constituents = [constituent(name, values[name][index]) for name in identifiers]
        extracted.append({
            **point,
            "datum": "FES2022 mean sea level harmonic datum",
            "units": "cm",
            "water": True,
            "interpolationQuality": quality_value,
            "interpolationMethod": "interpolated" if quality_value > 0 else "extrapolated",
            "constituents": constituents,
        })
    for point, error in zip(
        extracted,
        round_trip_errors(configuration, model, extracted),
        strict=True,
    ):
        point["constituentRoundTripMaxErrorCm"] = error
    return {
        "schema": "tide-here/harmonic-tile/v1",
        "dataset": dataset,
        "tile": {**source_tile, "points": extracted},
    }


def main() -> None:
    args = arguments()
    plan = load_json(args.plan)
    if plan.get("schema") != "tide-here/fes-extraction-plan/v1" or not plan.get("tiles"):
        raise ValueError("The global FES extraction plan is invalid")
    if args.atlas.stat().st_size != EXPECTED_ATLAS_BYTES:
        raise ValueError("The FES2022 atlas size is incomplete")
    atlas_sha256 = sha256(args.atlas)
    if atlas_sha256 != EXPECTED_ATLAS_SHA256:
        raise ValueError("The FES2022 atlas checksum does not match the recorded source")

    dataset = {
        **plan["dataset"],
        "sourceFiles": [{
            "name": args.atlas.name,
            "bytes": EXPECTED_ATLAS_BYTES,
            "sha256": atlas_sha256,
        }],
    }
    os.environ["FES2022_NS_GRID"] = str(args.atlas.resolve())
    configuration = pyfes.config.load(args.config)
    model = configuration.models["tide"]
    tiles_directory = args.output_directory / "tiles"
    inventory = []
    total_points = 0

    for number, source_tile in enumerate(plan["tiles"], start=1):
        name = object_name(source_tile["id"])
        path = tiles_directory / f"{name}.json"
        if not valid_existing(path, dataset, source_tile):
            document = extract_tile(configuration, model, dataset, source_tile)
            if not document["tile"]["points"]:
                print(f"Skipped empty tile {source_tile['id']}", flush=True)
                continue
            atomic_write(path, json_body(document))
        document = load_json(path)
        point_count = len(document["tile"]["points"])
        total_points += point_count
        body_bytes = path.stat().st_size
        inventory.append({
            "id": source_tile["id"],
            "objectName": name,
            "bounds": source_tile["bounds"],
            "maximumDistanceKm": max(point["maximumDistanceKm"] for point in document["tile"]["points"]),
            "pointCount": point_count,
            "bytes": body_bytes,
            "sha256": sha256(path),
        })
        if number % 25 == 0 or number == len(plan["tiles"]):
            print(json.dumps({"tiles": number, "totalTiles": len(plan["tiles"]), "points": total_points}), flush=True)

    planned_points = dataset["sampling"]["pointCount"]
    total_skipped = planned_points - total_points
    dataset["sampling"] = {
        **dataset["sampling"],
        "plannedPointCount": planned_points,
        "pointCount": total_points,
        "skippedUndefinedPoints": total_skipped,
    }
    if total_points < 1_000:
        raise ValueError("The extracted package is not global coastal coverage")

    # Rewrite the per-tile dataset metadata once with final extraction counts.
    for entry in inventory:
        path = tiles_directory / f"{entry['objectName']}.json"
        document = load_json(path)
        document["dataset"] = dataset
        atomic_write(path, json_body(document))
        entry["bytes"] = path.stat().st_size
        entry["sha256"] = sha256(path)

    tile_index = {
        "schema": "tide-here/fes-tile-index/v1",
        "dataset": {"id": dataset["id"], "version": dataset["version"]},
        "inventory": inventory,
    }
    index_path = args.output_directory / "tile-index.json"
    atomic_write(index_path, json_body(tile_index))
    objects = [{"name": "tile-index", "file": "tile-index.json", "sha256": sha256(index_path)}]
    objects.extend({
        "name": entry["objectName"],
        "file": f"tiles/{entry['objectName']}.json",
        "sha256": entry["sha256"],
    } for entry in inventory)
    package = {
        "schema": "tide-here/fes-upload-package/v1",
        "dataset": dataset,
        "objects": objects,
    }
    atomic_write(args.output_directory / "package.json", json.dumps(package, indent=2) + "\n")
    print(json.dumps({
        "output": str(args.output_directory),
        "tiles": len(inventory),
        "points": total_points,
        "skipped": total_skipped,
        "bytes": sum((args.output_directory / item["file"]).stat().st_size for item in objects),
    }), flush=True)


if __name__ == "__main__":
    main()
