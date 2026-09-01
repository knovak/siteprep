#!/usr/bin/env python3
"""Build a deterministic global coastal-point plan for offline FES2022 extraction."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from collections import defaultdict
from pathlib import Path

from shapely.geometry import Point, shape
from shapely.strtree import STRtree


EARTH_RADIUS_KM = 6371.0088


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--coastline", type=Path, action="append", required=True)
    parser.add_argument("--time-zones", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--spacing-km", type=float, default=15)
    parser.add_argument("--maximum-distance-km", type=float, default=40)
    parser.add_argument("--tile-degrees", type=int, default=10)
    parser.add_argument("--prepared-at", required=True)
    parser.add_argument("--version", required=True)
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


def normalize_longitude(value: float) -> float:
    return ((value + 180) % 360) - 180


def distance_km(first: list[float], second: list[float]) -> float:
    first_latitude = math.radians(first[1])
    second_latitude = math.radians(second[1])
    latitude_delta = second_latitude - first_latitude
    longitude_delta = math.radians(normalize_longitude(second[0] - first[0]))
    value = (
        math.sin(latitude_delta / 2) ** 2
        + math.cos(first_latitude) * math.cos(second_latitude) * math.sin(longitude_delta / 2) ** 2
    )
    return EARTH_RADIUS_KM * 2 * math.atan2(math.sqrt(value), math.sqrt(max(0, 1 - value)))


def interpolate(first: list[float], second: list[float], ratio: float) -> list[float]:
    longitude_delta = normalize_longitude(second[0] - first[0])
    return [
        normalize_longitude(first[0] + longitude_delta * ratio),
        first[1] + (second[1] - first[1]) * ratio,
    ]


def sample_line(line: list[list[float]], spacing_km: float) -> list[list[float]]:
    if not line:
        return []
    sampled = [[float(line[0][0]), float(line[0][1])]]
    remaining = spacing_km
    previous = sampled[0]
    for raw_next in line[1:]:
        next_point = [float(raw_next[0]), float(raw_next[1])]
        segment = distance_km(previous, next_point)
        while segment >= remaining and segment > 0:
            point = interpolate(previous, next_point, remaining / segment)
            sampled.append(point)
            previous = point
            segment = distance_km(previous, next_point)
            remaining = spacing_km
        remaining -= segment
        previous = next_point
    end = [float(line[-1][0]), float(line[-1][1])]
    if distance_km(sampled[-1], end) >= spacing_km / 2:
        sampled.append(end)
    return sampled


def coastline_points(documents: list[dict], spacing_km: float) -> list[list[float]]:
    unique = {}
    for document in documents:
        for feature in document.get("features", []):
            geometry = feature.get("geometry") or {}
            if geometry.get("type") == "LineString":
                lines = [geometry.get("coordinates", [])]
            elif geometry.get("type") == "MultiLineString":
                lines = geometry.get("coordinates", [])
            else:
                continue
            for line in lines:
                for longitude, latitude in sample_line(line, spacing_km):
                    key = (round(latitude, 4), round(normalize_longitude(longitude), 4))
                    unique.setdefault(key, [key[1], key[0]])
    return [unique[key] for key in sorted(unique)]


def time_zone_index(document: dict) -> dict:
    geometries = []
    time_zones = []
    for feature in document.get("features", []):
        time_zone = feature.get("properties", {}).get("tzid")
        if not time_zone:
            continue
        geometry = shape(feature.get("geometry") or {})
        if geometry.is_empty:
            continue
        geometries.append(geometry)
        time_zones.append(time_zone)
    return {"geometries": geometries, "timeZones": time_zones, "tree": STRtree(geometries)}


def time_zone_for(point: list[float], index: dict) -> str:
    longitude, latitude = point
    candidate = Point(longitude, latitude)
    for position in sorted(int(value) for value in index["tree"].query(candidate, predicate="intersects")):
        if index["geometries"][position].covers(candidate):
            return index["timeZones"][position]
    # The ocean-inclusive boundary release stops short of the poles. UTC keeps
    # those remote Antarctic and Arctic samples usable without inventing a
    # nearby civil zone.
    if latitude <= -60 or latitude >= 84:
        return "Etc/UTC"
    raise ValueError(f"No IANA time zone covers {latitude}, {longitude}")


def point_id(latitude: float, longitude: float) -> str:
    latitude_key = f"{'n' if latitude >= 0 else 's'}{abs(round(latitude * 10_000)):06d}"
    longitude_key = f"{'e' if longitude >= 0 else 'w'}{abs(round(longitude * 10_000)):07d}"
    return f"fes2022-coast-{latitude_key}-{longitude_key}"


def tile_key(latitude: float, longitude: float, size: int) -> tuple[int, int]:
    latitude_index = min((180 // size) - 1, max(0, math.floor((latitude + 90) / size)))
    longitude_index = min((360 // size) - 1, max(0, math.floor((longitude + 180) / size)))
    return latitude_index, longitude_index


def build_plan(args: argparse.Namespace) -> dict:
    coastline_documents = [load_json(path) for path in args.coastline]
    zones = time_zone_index(load_json(args.time_zones))
    sampled = coastline_points(coastline_documents, args.spacing_km)
    tiles = defaultdict(list)
    for longitude, latitude in sampled:
        time_zone = time_zone_for([longitude, latitude], zones)
        tiles[tile_key(latitude, longitude, args.tile_degrees)].append({
            "id": point_id(latitude, longitude),
            "name": f"FES2022 coastal point {latitude:.4f}, {longitude:.4f}",
            "country": None,
            "latitude": latitude,
            "longitude": longitude,
            "timeZone": time_zone,
            "maximumDistanceKm": args.maximum_distance_km,
        })
    plan_tiles = []
    for (latitude_index, longitude_index), points in sorted(tiles.items()):
        south = -90 + latitude_index * args.tile_degrees
        west = -180 + longitude_index * args.tile_degrees
        plan_tiles.append({
            "id": f"global-coast-{latitude_index:02d}-{longitude_index:02d}",
            "bounds": {
                "south": south,
                "west": west,
                "north": south + args.tile_degrees,
                "east": west + args.tile_degrees,
            },
            "points": points,
        })
    sources = [{
        "name": path.name,
        "bytes": path.stat().st_size,
        "sha256": sha256(path),
    } for path in [*args.coastline, args.time_zones]]
    return {
        "schema": "tide-here/fes-extraction-plan/v1",
        "dataset": {
            "id": "fes2022b-global-coast",
            "version": args.version,
            "schema": "tide-here/fes-prepared-dataset/v2",
            "preparedAt": args.prepared_at,
            "displayName": "FES2022b global coastal points",
            "dataClass": "licensed-source",
            "model": "FES2022b native non-structured ocean tide atlas",
            "isFes2022": True,
            "attribution": "FES2022 Tide product funded by CNES and produced by LEGOS, NOVELTIS and CLS; transformed by Tide Here into sampled native-mesh coastal harmonics.",
            "sourceUrl": "https://doi.org/10.24400/527896/A01-2024.004",
            "licenceUrl": "https://www.aviso.altimetry.fr/fileadmin/documents/data/License_Aviso.pdf",
            "licenceReference": "AVISO License, Issue 20 (August 2026): https://www.aviso.altimetry.fr/fileadmin/documents/data/License_Aviso.pdf",
            "disclaimer": "Transformed FES2022b model output sampled along public-domain coastlines; weather and storm surge are not included. AVISO provides the source as-is; Tide Here adds no navigation or safety warranty.",
            "engine": "PyFES 2026.5.2 native-grid interpolation/extrapolation; Tide Here runtime uses @neaps/tide-predictor 0.11.0 with Schureman nodal corrections",
            "sampling": {
                "spacingKm": args.spacing_km,
                "maximumSelectionDistanceKm": args.maximum_distance_km,
                "tileDegrees": args.tile_degrees,
                "pointCount": len(sampled),
                "sources": sources,
            },
        },
        "tiles": plan_tiles,
    }


def main() -> None:
    args = arguments()
    if not 1 <= args.spacing_km <= 50:
        raise ValueError("Spacing must be between 1 and 50 km")
    if args.maximum_distance_km < args.spacing_km / 2:
        raise ValueError("Maximum selection distance must cover half the sample spacing")
    if args.tile_degrees not in (5, 10, 15, 20):
        raise ValueError("Tile degrees must be 5, 10, 15, or 20")
    result = build_plan(args)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, separators=(",", ":")) + "\n", encoding="utf-8")
    print(json.dumps({
        "output": str(args.output),
        "tiles": len(result["tiles"]),
        "points": result["dataset"]["sampling"]["pointCount"],
        "bytes": args.output.stat().st_size,
    }))


if __name__ == "__main__":
    main()
