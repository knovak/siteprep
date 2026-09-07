"""Prepare checksum-verified, portable tide constants and offline place names.

Usage: python3 scripts/pack-data.py FES_PACKAGE CITIES1000_ZIP ADMIN1_TXT
The ordinary application build consumes the committed outputs, never downloads.
"""
import gzip
import hashlib
import json
import pathlib
import struct
import sys
import zipfile

OUT = pathlib.Path(__file__).resolve().parents[1] / 'data'
source, cities, admin = map(pathlib.Path, sys.argv[1:])
sha = lambda b: hashlib.sha256(b).hexdigest()
compact = lambda obj: json.dumps(obj, ensure_ascii=False, separators=(',', ':')).encode()
package = json.loads((source / 'package.json').read_bytes())
points = []
for entry in package['objects']:
    data = (source / entry['file']).read_bytes()
    assert sha(data) == entry['sha256'], entry['file']
    if entry['name'] != 'tile-index':
        points.extend(json.loads(data)['tile']['points'])
assert len(points) == package['dataset']['sampling']['pointCount'] == 65203
names = [c['name'] for c in points[0]['constituents']]
zones = sorted(set(p['timeZone'] for p in points))
records = bytearray()
max_error = 0
for p in points:
    assert p['water'] and p['units'] == 'cm' and p['maximumDistanceKm'] == 40
    assert [c['name'] for c in p['constituents']] == names
    records.extend(struct.pack('<ddHh', p['latitude'], p['longitude'], zones.index(p['timeZone']), p['interpolationQuality']))
    for c in p['constituents']:
        for key in ['amplitude', 'phase']:
            b = struct.pack('<f', c[key])
            max_error = max(max_error, abs(struct.unpack('<f', b)[0] - c[key]))
            records.extend(b)
metadata = dict(schema='tide-here/compact-harmonics/v1', count=len(points),
                recordBytes=20+8*len(names), constituents=names, zones=zones,
                dataset=package['dataset'], maxFloat32AbsoluteError=max_error,
                sourcePackageSha256=sha((source / 'package.json').read_bytes()))
header = compact(metadata)
packed = struct.pack('<I', len(header)) + header + records
(OUT / 'coastal-harmonics.bin.gz').write_bytes(gzip.compress(packed, compresslevel=9, mtime=0))

regions = {r[0]:r[1] for r in (line.split('\t') for line in admin.read_text().splitlines())}
with zipfile.ZipFile(cities) as archive:
    rows = archive.read('cities1000.txt').decode().splitlines()
places = []
for line in rows:
    p = line.split('\t')
    # Keep native and ASCII names, all supplied aliases, and administrative context.
    aliases = list(dict.fromkeys([p[1], p[2]] + p[3].split(',')))
    places.append([int(p[0]), p[1], p[8], regions.get(p[8]+'.'+p[10], p[10]),
                   float(p[4]), float(p[5]), int(p[14]), '|'.join(n for n in aliases if n)])
places.sort(key=lambda p: (-p[6], p[0]))
place_data = compact(dict(schema='tide-here/offline-places/v1', places=places))
(OUT / 'places.json.gz').write_bytes(gzip.compress(place_data, compresslevel=9, mtime=0))
manifest = dict(schema='tide-here/offline-data-manifest/v1', preparedDate='2026-09-07',
    harmonics=metadata, places=dict(count=len(places), sourceUrl='https://download.geonames.org/export/dump/cities1000.zip',
    sourceSha256=sha(cities.read_bytes()), adminUrl='https://download.geonames.org/export/dump/admin1CodesASCII.txt',
    adminSha256=sha(admin.read_bytes()), licenceUrl='https://creativecommons.org/licenses/by/4.0/',
    attribution='GeoNames, CC BY 4.0. Fields selected and compacted by Tide Here.'),
    files={name:dict(bytes=(OUT/name).stat().st_size, sha256=sha((OUT/name).read_bytes()))
           for name in ['coastal-harmonics.bin.gz','places.json.gz']})
(OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
print(json.dumps(dict(points=len(points), places=len(places), files=manifest['files']), indent=2))
