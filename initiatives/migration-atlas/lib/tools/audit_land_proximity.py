#!/usr/bin/env python3
"""Measure stored endpoints against both bundled land surfaces, without moving them."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import subprocess
from audit_geography import ROOT, INPUTS, SCRIPT

RADIUS_KM = 6371.0088  # Fixed mean-Earth spherical model; not an ellipsoidal survey.
THRESHOLD_KM = 300


def dot(a, b):
    return sum(x * y for x, y in zip(a, b))


def cross(a, b):
    return (a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0])


def norm(a):
    return math.sqrt(dot(a, a))


def unit(a):
    length = norm(a)
    return tuple(x / length for x in a)


def vector(lonlat):
    lon, lat = map(math.radians, lonlat)
    return (math.cos(lat)*math.cos(lon), math.cos(lat)*math.sin(lon), math.sin(lat))


def angle(a, b):
    return math.atan2(norm(cross(a, b)), dot(a, b))


def lonlat(p):
    return [math.degrees(math.atan2(p[1], p[0])), math.degrees(math.atan2(p[2], math.hypot(p[0], p[1])))]


def nearest_on_segment(p, a, b):
    """Closest point on the minor great-circle arc a-b, all unit vectors."""
    candidates = [a, b]
    n = cross(a, b)
    length = norm(n)
    if length < 1e-14:
        if dot(a, b) < 0:
            raise ValueError('Antipodal segment has no unique minor arc')
    else:
        n = unit(n)
        q = tuple(p[i] - dot(p, n)*n[i] for i in range(3))
        if norm(q) > 1e-14:
            q = unit(q)
            arc = angle(a, b)
            for candidate in [q, tuple(-x for x in q)]:
                if abs(angle(a, candidate) + angle(candidate, b) - arc) < 1e-10:
                    candidates.append(candidate)
    closest = min(candidates, key=lambda x: angle(p, x))
    return angle(p, closest), closest


def rings(geo):
    kind = geo['type']
    if kind == 'FeatureCollection':
        for f in geo['features']:
            yield from rings(f)
    elif kind == 'Feature':
        yield from rings(geo['geometry'])
    elif kind == 'GeometryCollection':
        for g in geo['geometries']:
            yield from rings(g)
    elif kind == 'Polygon':
        yield from geo['coordinates']
    elif kind == 'MultiPolygon':
        for polygon in geo['coordinates']:
            yield from polygon
    else:
        raise ValueError('Expected land polygons, got ' + kind)


def segments(geo):
    result = []
    for ring in rings(geo):
        if len(ring) < 4 or ring[0] != ring[-1]:
            raise ValueError('Land polygon ring must be closed')
        points = [vector(p) for p in ring]
        result.extend(zip(points[:-1], points[1:]))
    if not result:
        raise ValueError('Land surface has no edges')
    return result


def nearest_boundary(point, edges):
    p = vector(point)
    radians, closest = min((nearest_on_segment(p, a, b) for a, b in edges), key=lambda result: result[0])
    return radians * RADIUS_KM, lonlat(closest)


def report():
    # Containment uses exactly the vendored D3 implementation that renders the atlas.
    run = subprocess.run(['node', '-e', SCRIPT], cwd=ROOT, check=True, capture_output=True, text=True)
    points = json.loads(run.stdout)
    maps = {scale: segments(json.loads((ROOT / f'data/basemap/land{scale}.json').read_text())) for scale in ['110', '50']}
    cache = {}
    for row in points:
        for scale, edges in maps.items():
            if row[f'inside_land{scale}']:
                distance, closest = 0.0, [row['lon'], row['lat']]
            else:
                key = (scale, row['lon'], row['lat'])
                if key not in cache:
                    cache[key] = nearest_boundary([row['lon'], row['lat']], edges)
                distance, closest = cache[key]
            row[f'land{scale}'] = {
                'distance_km': round(distance, 6),
                'nearest_lon_lat': [round(x, 8) for x in closest],
                # Classify before rounding; equality is within the plan's limit.
                'beyond_300_km': distance > THRESHOLD_KM,
            }
        row['flagged'] = any(row[f'land{s}']['beyond_300_km'] for s in maps)
    inputs = (*INPUTS, 'tools/audit_geography.py', 'tools/audit_land_proximity.py')
    return {
        'method': 'Vendored D3 spherical containment; contained points have zero land distance. Outside points use the minimum over minor great-circle polygon edges, including endpoints and interior perpendicular feet.',
        'radius_km': RADIUS_KM, 'threshold_km': THRESHOLD_KM,
        'limits': 'Distances refer to the two simplified bundled land surfaces, not exact coastlines or historical settlements. Generalization and omitted islands can change the answer. Flags request editorial review; no endpoint is relocated and proximity does not certify regional labels, allocations or T8.',
        'input_sha256': {name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest() for name in inputs},
        'counts': {'points': len(points), 'sources': sum(p['role']=='source' for p in points), 'destinations': sum(p['role']=='destination' for p in points), 'flagged_either_scale': sum(p['flagged'] for p in points), **{f'beyond_300_km_land{s}': sum(p[f'land{s}']['beyond_300_km'] for p in points) for s in maps}},
        'points': points,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    rendered = json.dumps(report(), indent=2, ensure_ascii=False) + '\n'
    if args.output:
        args.output.write_text(rendered, encoding='utf-8')
    else:
        print(rendered, end='')


if __name__ == '__main__':
    main()
