#!/usr/bin/env python3
"""
generate_divider.py — Create a circular "donut" divider image for photo collections.

A square JPEG with three concentric color regions (corners / donut ring / center)
and a bold title centered in the middle circle. EXIF date/time tags are written
so photo apps (Lightroom, Apple Photos, Google Photos, etc.) sort it like a real
photo taken at the given date/time.

Usage:
    python3 generate_divider.py "Baltics" --output baltics.jpg
    python3 generate_divider.py "Breckenridge" --date 2025-12-17 --center pink --output breck.jpg

See README.md for the full list of options and color names.
"""

import argparse
import datetime
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

try:
    import piexif
except ImportError:
    piexif = None

# Reasonable default size — large enough to look crisp, small enough to be fast.
DEFAULT_SIZE = 2000

# Proportion of the half-diagonal/half-side used for the donut's outer and inner
# radius. The donut always touches the edges of the square (its outer radius
# reaches the midpoint of each side), and the center circle is a fixed fraction
# of the donut's outer radius.
DONUT_OUTER_FRACTION = 0.5   # of image size -> outer radius touches edges
DONUT_INNER_FRACTION = 0.78  # inner radius as a fraction of outer radius

# A small set of friendly color names in addition to anything PIL/Pillow already
# understands (e.g. "#ff8800", "rgb(255,0,0)", "cornflowerblue", ...).
FRIENDLY_COLORS = {
    "pink": "#f4a6c1",
    "light green": "#b6d7a8",
    "lightgreen": "#b6d7a8",
    "light blue": "#a8c8e8",
    "lightblue": "#a8c8e8",
    "light grey": "#d9d9d9",
    "light gray": "#d9d9d9",
    "lightgrey": "#d9d9d9",
    "lightgray": "#d9d9d9",
    "light orange": "#f9c98a",
    "lightorange": "#f9c98a",
    "light purple": "#d6b8e8",
    "lightpurple": "#d6b8e8",
    "light pink": "#f4c2d7",
    "light yellow": "#f5eca3",
    "peach": "#f9cba3",
    "lavender": "#d3b8e8",
    "cream": "#f5f0d9",
    "mint": "#b8e8d0",
    "butter": "#f5e7a3",
}

FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/Library/Fonts/Arial Bold.ttf",
    "C:\\Windows\\Fonts\\arialbd.ttf",
]


def resolve_color(name: str) -> str:
    """Allow friendly names like 'pink' alongside anything Pillow already accepts."""
    key = name.strip().lower()
    return FRIENDLY_COLORS.get(key, name)


def find_bold_font() -> str:
    for candidate in FONT_CANDIDATES:
        if Path(candidate).exists():
            return candidate
    raise FileNotFoundError(
        "Could not find a bold TrueType font on this system. "
        "Install one (e.g. 'apt-get install fonts-dejavu-core') or pass --font with a path."
    )


def fit_font(draw: ImageDraw.ImageDraw, text: str, font_path: str, max_width: int, max_height: int) -> ImageFont.FreeTypeFont:
    """Binary-search the largest font size whose bounding box fits the given box."""
    lo, hi = 4, max_height
    best = ImageFont.truetype(font_path, lo)
    while lo <= hi:
        mid = (lo + hi) // 2
        font = ImageFont.truetype(font_path, mid)
        bbox = draw.textbbox((0, 0), text, font=font)
        w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
        if w <= max_width and h <= max_height:
            best = font
            lo = mid + 1
        else:
            hi = mid - 1
    return best


def draw_text_with_outline(draw, xy, text, font, fill, outline, outline_width):
    x, y = xy
    if outline and outline_width > 0:
        for dx in range(-outline_width, outline_width + 1):
            for dy in range(-outline_width, outline_width + 1):
                if dx == 0 and dy == 0:
                    continue
                draw.text((x + dx, y + dy), text, font=font, fill=outline)
    draw.text((x, y), text, font=font, fill=fill)


def build_exif_bytes(date: datetime.date, time: datetime.time) -> bytes:
    if piexif is None:
        return b""
    dt_str = f"{date.strftime('%Y:%m:%d')} {time.strftime('%H:%M:%S')}"
    exif_dict = {
        "0th": {piexif.ImageIFD.Software: "divider-image".encode()},
        "Exif": {
            piexif.ExifIFD.DateTimeOriginal: dt_str.encode(),
            piexif.ExifIFD.DateTimeDigitized: dt_str.encode(),
        },
        "1st": {},
        "thumbnail": None,
    }
    exif_dict["0th"][piexif.ImageIFD.DateTime] = dt_str.encode()
    return piexif.dump(exif_dict)


def generate(
    title: str,
    corner_color: str = "black",
    donut_color: str = "red",
    center_color: str = "light green",
    date: datetime.date | None = None,
    time: datetime.time | None = None,
    size: int = DEFAULT_SIZE,
    font_path: str | None = None,
    output: str = "divider.jpg",
    text_color: str = "black",
    outline_color: str = "white",
    outline_width: int | None = None,
):
    if date is None:
        date = datetime.date.today()
    if time is None:
        time = datetime.time(0, 0)

    corner_color = resolve_color(corner_color)
    donut_color = resolve_color(donut_color)
    center_color = resolve_color(center_color)
    text_color = resolve_color(text_color)
    outline_color = resolve_color(outline_color)

    img = Image.new("RGB", (size, size), corner_color)
    draw = ImageDraw.Draw(img)

    cx = cy = size / 2
    outer_r = size * DONUT_OUTER_FRACTION
    inner_r = outer_r * DONUT_INNER_FRACTION

    draw.ellipse([cx - outer_r, cy - outer_r, cx + outer_r, cy + outer_r], fill=donut_color)
    draw.ellipse([cx - inner_r, cy - inner_r, cx + inner_r, cy + inner_r], fill=center_color)

    font_path = font_path or find_bold_font()
    # Keep the title within the center circle, with some breathing room.
    box_size = inner_r * 2 * 0.78
    font = fit_font(draw, title, font_path, max_width=box_size, max_height=box_size * 0.5)

    bbox = draw.textbbox((0, 0), title, font=font)
    text_w, text_h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    text_x = cx - text_w / 2 - bbox[0]
    text_y = cy - text_h / 2 - bbox[1]

    if outline_width is None:
        # Scale outline thickness with font size so it reads well at any resolution.
        outline_width = max(1, int(font.size * 0.045))

    draw_text_with_outline(draw, (text_x, text_y), title, font, text_color, outline_color, outline_width)

    exif_bytes = build_exif_bytes(date, time)
    Path(output).parent.mkdir(parents=True, exist_ok=True)
    if exif_bytes:
        img.save(output, "JPEG", quality=95, exif=exif_bytes)
    else:
        img.save(output, "JPEG", quality=95)

    return output


def parse_args(argv=None):
    p = argparse.ArgumentParser(description="Generate a circular donut divider image for photo collections.")
    p.add_argument("title", help="Title text to display in the center, e.g. 'Baltics'")
    p.add_argument("--corner", default="black", help="Corner color (default: black)")
    p.add_argument("--donut", default="red", help="Donut ring color, should be bold/solid (default: red)")
    p.add_argument("--center", default="light green", help="Center circle color, should be light/pastel (default: light green)")
    p.add_argument("--date", default=None, help="Date for EXIF metadata, format YYYY-MM-DD (default: today)")
    p.add_argument("--time", default="00:00", help="Time for EXIF metadata, format HH:MM or HH:MM:SS (default: 00:00)")
    p.add_argument("--size", type=int, default=DEFAULT_SIZE, help=f"Image width/height in pixels (default: {DEFAULT_SIZE})")
    p.add_argument("--font", default=None, help="Path to a .ttf/.otf bold font file (default: auto-detect)")
    p.add_argument("--text-color", default="black", help="Title text color (default: black)")
    p.add_argument("--outline-color", default="white", help="Title outline/shadow color (default: white)")
    p.add_argument("--output", "-o", default="divider.jpg", help="Output JPEG path (default: divider.jpg)")
    return p.parse_args(argv)


def main(argv=None):
    args = parse_args(argv)

    date = datetime.date.fromisoformat(args.date) if args.date else datetime.date.today()
    time_str = args.time
    if len(time_str.split(":")) == 2:
        time_str += ":00"
    time = datetime.time.fromisoformat(time_str)

    output = generate(
        title=args.title,
        corner_color=args.corner,
        donut_color=args.donut,
        center_color=args.center,
        date=date,
        time=time,
        size=args.size,
        font_path=args.font,
        output=args.output,
        text_color=args.text_color,
        outline_color=args.outline_color,
    )
    print(f"Wrote {output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
