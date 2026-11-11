#!/usr/bin/env python3
"""Reduce the Yale Bright Star Catalog (BSC5) to a compact JSON for the
SBDC simulator: [ra_deg, dec_deg, vmag] per star (J2000), mags quantized
to 0.1. Also attaches proper names for the brightest ~25 stars (tooltips).

Source: http://tdc-www.harvard.edu/catalogs/bsc5.html (public domain).
Byte layout (1-based columns) per the BSC5 readme:
  76-77 RAh, 78-79 RAm, 80-83 RAs   (J2000)
  84 Dec sign, 85-86 DecD, 87-88 DecM, 89-90 DecS
  103-107 Vmag
Entries without positions (novae etc.) are skipped.
"""
import gzip, json, hashlib, sys

SRC = "/tmp/bsc5.dat.gz"
OUT = "data/bsc-reduced.json"

NAMES = {  # HR number -> proper name, for tooltips
    2491: "Sirius", 2326: "Canopus", 5459: "Alpha Centauri", 5340: "Arcturus",
    7001: "Vega", 1708: "Capella", 1713: "Rigel", 2943: "Procyon",
    2061: "Betelgeuse", 472: "Achernar", 5267: "Hadar", 7557: "Altair",
    2891: "Castor", 1457: "Aldebaran", 6134: "Antares", 3982: "Regulus",
    8728: "Fomalhaut", 4853: "Mimosa", 2990: "Pollux", 7924: "Deneb",
    4763: "Acrux", 5056: "Spica", 424: "Polaris", 8425: "Alnair",
    3207: "Miaplacidus",
}

def main():
    raw = gzip.open(SRC, "rb").read()
    sha = hashlib.sha256(raw).hexdigest()
    stars, names = [], {}
    skipped = 0
    for line in raw.decode("ascii", "replace").splitlines():
        if len(line) < 107:
            line = line.ljust(107)
        try:
            hr = int(line[0:4])
            rah, ram, ras = int(line[75:77]), int(line[77:79]), float(line[79:83])
            sgn = -1.0 if line[83] == "-" else 1.0
            dd, dm, ds = int(line[84:86]), int(line[86:88]), int(line[88:90])
            v = float(line[102:107])
        except ValueError:
            skipped += 1
            continue
        ra = (rah + ram / 60 + ras / 3600) * 15.0
        dec = sgn * (dd + dm / 60 + ds / 3600)
        stars.append((int(round(ra * 100)), int(round(dec * 100)), int(round(v * 10))))
        if hr in NAMES:
            names[str(len(stars) - 1)] = NAMES[hr]
    out = {
        "source": "Yale Bright Star Catalogue, 5th ed. (BSC5), tdc-www.harvard.edu",
        "license": "public domain",
        "sourceSha256": sha,
        "epoch": "J2000",
        "packing": "columns; ra/dec in centidegrees (deg*100), v in decimags (mag*10)",
        "count": len(stars),
        "skippedNoPosition": skipped,
        "names": names,
        "ra": [s[0] for s in stars],
        "dec": [s[1] for s in stars],
        "v": [s[2] for s in stars],
    }
    with open(OUT, "w") as f:
        json.dump(out, f, separators=(",", ":"))
    print(f"stars={len(stars)} skipped={skipped} names={len(names)} "
          f"bytes={len(json.dumps(out, separators=(',', ':')))}")

if __name__ == "__main__":
    main()
