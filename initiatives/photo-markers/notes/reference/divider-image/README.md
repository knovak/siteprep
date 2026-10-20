# divider-image

Generate square "donut" divider images for photo collections — a bold colored
ring on a dark background with a large title in the center, saved as a JPEG
with EXIF date/time so photo apps sort it correctly alongside real photos.

---

## What it does

The script draws a single square image made of three concentric color regions:

```
┌──────────────────────────────┐
│  corners (default: black)    │
│    ╭────────────────────╮    │
│    │  donut ring (red)  │    │
│    │   ╭────────────╮   │    │
│    │   │  center    │   │    │
│    │   │   TITLE    │   │    │
│    │   │  (green)   │   │    │
│    │   ╰────────────╯   │    │
│    ╰────────────────────╯    │
╰──────────────────────────────╯
```

- The **outer ring's edge always touches the midpoints of the square's four sides** — it is not adjustable, so every divider looks consistent in a collection.
- The **title text** is auto-sized to be as large as possible while still fitting inside the center circle, with a white outline for readability on any center color.
- The result is saved as a **JPEG** with EXIF `DateTimeOriginal`, `DateTimeDigitized`, and `DateTime` all set to the supplied date/time — the same tags a camera writes — so apps like Apple Photos, Google Photos, and Lightroom sort it in the right place in your timeline.

---

## Files

```
divider-image/
├── SKILL.md                  Claude skill trigger + usage instructions
├── README.md                 This file
└── scripts/
    └── generate_divider.py   The image generator (the only file you need to run)
```

---

## Requirements

Python 3.9+ with two packages:

```bash
pip install Pillow piexif
```

- **Pillow** — draws the image (circles, text, JPEG encoding).
- **piexif** — writes EXIF metadata into the JPEG so photo apps see the date.

A bold TrueType font is auto-detected from common system locations
(DejaVu Sans Bold on Linux, Arial Bold on macOS/Windows). Pass `--font` with a
path to override.

---

## Usage

```
python3 scripts/generate_divider.py "TITLE" [options] -o output.jpg
```

### All parameters

| Parameter | Flag | Default | Notes |
|---|---|---|---|
| Title text | positional | *(required)* | Displayed in the center circle. Any text, any length — font is auto-sized to fit. |
| Corner color | `--corner` | `black` | The four triangular corners outside the ring. |
| Ring / donut color | `--donut` | `red` | The bold ring. Works best as a solid, saturated color. |
| Center color | `--center` | `light green` | The inner circle background. Works best as a light/pastel shade. |
| Date | `--date` | today | EXIF date. Format: `YYYY-MM-DD`. |
| Time | `--time` | `00:00` | EXIF time. Format: `HH:MM` or `HH:MM:SS`. |
| Output path | `--output` / `-o` | `divider.jpg` | Destination JPEG file. |
| Image size | `--size` | `2000` | Width and height in pixels (always square). 2000px is plenty for any screen or print use. |
| Font file | `--font` | auto-detect | Path to a `.ttf` or `.otf` bold font. |
| Text color | `--text-color` | `black` | Color of the title text itself. |
| Outline color | `--outline-color` | `white` | Color of the thin outline drawn behind each letter for legibility. |

### Color values

Any of these formats work:

- **CSS color names**: `red`, `blue`, `orange`, `purple`, `green`, `brown`, etc.
- **Hex codes**: `#ff8800`, `#3a7bd5`
- **RGB**: `rgb(255, 136, 0)`
- **Built-in friendly names** (added because CSS doesn't have multi-word pastels):
  `pink`, `light green`, `light blue`, `light grey`, `light orange`, `light purple`,
  `light pink`, `light yellow`, `peach`, `lavender`, `cream`, `mint`, `butter`

---

## Examples

```bash
# Defaults: black corners, red ring, light green center — matches the reference design
python3 scripts/generate_divider.py "Baltics" -o baltics.jpg

# Custom colors and EXIF date
python3 scripts/generate_divider.py "Breckenridge" --center pink --date 2025-12-17 -o breckenridge.jpg

# Blue/grey theme common for North American road trip albums
python3 scripts/generate_divider.py "US West" --corner black --donut blue --center "light blue" --date 2021-09-19 -o us_west.jpg

# Purple/pink European travel theme
python3 scripts/generate_divider.py "Baltics" --corner black --donut purple --center "light pink" --date 2026-05-24 -o baltics_euro.jpg

# Larger output for print
python3 scripts/generate_divider.py "Tokyo 2024" --center "light purple" --size 4000 -o tokyo_print.jpg
```

---

## Batch generation

To generate many images from a CSV, write a driver script like this:

```python
import csv, re, subprocess, os

SCRIPT = "scripts/generate_divider.py"
OUTDIR = "output"
os.makedirs(OUTDIR, exist_ok=True)

def slug(text):
    return re.sub(r"[^A-Za-z0-9]+", "_", text).strip("_")

with open("dividers.csv") as f:
    for row in csv.DictReader(f):
        fname = f"{row['date']}_{slug(row['title'])}.jpg"
        out = os.path.join(OUTDIR, fname)
        if os.path.exists(out):
            continue  # skip already-generated files
        subprocess.run([
            "python3", SCRIPT, row["title"],
            "--corner", row["corner"],
            "--donut",  row["donut"],
            "--center", row["center"],
            "--date",   row["date"],
            "-o",       out,
        ], check=True)
```

CSV format (header row required):

```
date,title,corner,donut,center
2026-05-24,Baltics,black,purple,light pink
2026-06-12,London,black,purple,light pink
```

**Tip**: Use `date_title` as the filename so duplicated titles (e.g. "CA" appearing four times) stay unique as long as each row has a distinct date.

---

## How the image is drawn

1. **Canvas** — a solid-color square (`--corner` color) at the requested pixel size.
2. **Outer ellipse** (the donut) — a filled circle whose radius is exactly half the image width, so it touches all four edges.
3. **Inner ellipse** (the center) — a filled circle at 78% of the outer radius, creating the visible ring.
4. **Font sizing** — binary search from 4pt upward to find the largest font size where the title bounding box fits inside a box that is 78% of the center circle's diameter (horizontal constraint) and 50% of that (vertical constraint, to leave headroom).
5. **Text rendering** — the title is drawn with a per-pixel outline (white by default) for legibility, then the main text color on top.
6. **EXIF** — `piexif` writes a minimal EXIF block containing `DateTimeOriginal`, `DateTimeDigitized`, and `DateTime` (all set to `YYYY:MM:DD HH:MM:SS`), plus a `Software` tag of `divider-image`.

---

## Moving to a web service

The script is self-contained and has no external network calls, so it's straightforward to wrap as a web endpoint. Here is a minimal Flask example:

```python
from flask import Flask, request, send_file
import io, datetime, sys
sys.path.insert(0, "scripts")
from generate_divider import generate  # import the function directly

app = Flask(__name__)

@app.route("/divider")
def divider():
    title  = request.args.get("title", "Untitled")
    corner = request.args.get("corner", "black")
    donut  = request.args.get("donut",  "red")
    center = request.args.get("center", "light green")
    date_s = request.args.get("date",   datetime.date.today().isoformat())
    time_s = request.args.get("time",   "00:00")
    size   = int(request.args.get("size", 2000))

    date = datetime.date.fromisoformat(date_s)
    time = datetime.time.fromisoformat(time_s if ":" in time_s else time_s + ":00")

    buf = io.BytesIO()
    # generate() writes to a file path; for a web service, write to a temp file
    # then stream it, or refactor generate() to accept a file-like object.
    import tempfile, os
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        path = tmp.name
    generate(title=title, corner_color=corner, donut_color=donut,
             center_color=center, date=date, time=time, size=size, output=path)
    return send_file(path, mimetype="image/jpeg",
                     download_name=f"{date_s}_{title.replace(' ','_')}.jpg")

if __name__ == "__main__":
    app.run(debug=True)
```

Example request:
```
GET /divider?title=Baltics&donut=purple&center=light+pink&date=2026-05-24
```

For a production service you'd want to:
- Run on gunicorn / uvicorn behind nginx.
- Clean up the temp file after streaming.
- Cap `--size` to avoid memory abuse (2000 is plenty; 4000 is safe; 8000+ gets slow).
- Rate-limit requests if publicly exposed.
- Consider a simple API key header if you don't want it open to the world.

---

## Extending the script

### Adding more friendly color names

The `FRIENDLY_COLORS` dict near the top of `generate_divider.py` is the only place you need to edit to add new shorthand names. Pillow accepts any CSS color name (`cornflowerblue`, `goldenrod`, `mediumaquamarine`, etc.) and hex codes directly, so the dict is only needed for multi-word names that CSS doesn't define (like `light orange`) or convenient aliases you want to type without remembering hex codes.

```python
FRIENDLY_COLORS = {
    ...
    "sage":        "#b2c9a7",   # muted green, good for nature albums
    "dusty rose":  "#c9a7b2",   # desaturated pink
    "slate blue":  "#6a7fbd",   # works well as a donut color
}
```

### Different shapes

The image is built with standard Pillow `ImageDraw` calls, so you can replace or augment the circles with any shape Pillow supports:

**Rounded rectangle center instead of circle:**
```python
# Replace the inner ellipse draw call with:
r = inner_r * 0.25   # corner radius
draw.rounded_rectangle(
    [cx - inner_r, cy - inner_r, cx + inner_r, cy + inner_r],
    radius=r, fill=center_color
)
```

**Hexagon ring** (for a different look entirely):
```python
import math
def hex_points(cx, cy, r):
    return [(cx + r * math.cos(math.radians(60*i - 30)),
             cy + r * math.sin(math.radians(60*i - 30))) for i in range(6)]

draw.polygon(hex_points(cx, cy, outer_r), fill=donut_color)
draw.polygon(hex_points(cx, cy, inner_r), fill=center_color)
```

**Diamond / rotated square:**
```python
draw.polygon([
    (cx, cy - outer_r), (cx + outer_r, cy),
    (cx, cy + outer_r), (cx - outer_r, cy)
], fill=donut_color)
draw.polygon([
    (cx, cy - inner_r), (cx + inner_r, cy),
    (cx, cy + inner_r), (cx - inner_r, cy)
], fill=center_color)
```

To make shape a command-line parameter, add `--shape circle|hex|diamond|rounded` to the `argparse` block and dispatch in `generate()`.

### Multiple lines of text

The current font-fitting logic treats the title as a single line. To support two lines (e.g. `"BC\n2025"`), split on `\n` before sizing, reduce the vertical box to `box_size * 0.35` per line, and draw each line separately with a line-height offset.

### A thin border between ring and center

A clean separator makes the boundary crisper:
```python
border_width = int(size * 0.004)   # 0.4% of image width
draw.ellipse(
    [cx - inner_r - border_width, cy - inner_r - border_width,
     cx + inner_r + border_width, cy + inner_r + border_width],
    fill="black"
)
draw.ellipse([cx - inner_r, cy - inner_r, cx + inner_r, cy + inner_r],
             fill=center_color)
```

### Drop shadow on text (instead of outline)

For a softer look, draw the text offset by a few pixels in a semi-transparent dark color before drawing the main text. Pillow requires an RGBA canvas for transparency; convert to RGB just before saving:

```python
img = Image.new("RGBA", (size, size), corner_color)
# ... draw circles ...
shadow_offset = max(2, int(font.size * 0.04))
draw.text((text_x + shadow_offset, text_y + shadow_offset),
          title, font=font, fill=(0, 0, 0, 120))  # 120/255 opacity
draw.text((text_x, text_y), title, font=font, fill=text_color)
img = img.convert("RGB")
img.save(output, "JPEG", quality=95, exif=exif_bytes)
```

---

## Design notes

- **Why always touch the edges?** Consistency. When a dozen dividers sit among hundreds of photos, a uniform ring size makes them immediately recognizable as "a divider" rather than just an abstract image.
- **Why JPEG and not PNG?** JPEG is what cameras produce. Photo apps ingest it cleanly, display it natively, and can read its EXIF without any special handling. PNG would also work but EXIF support is patchier in photo apps.
- **Why auto-size the font?** Short titles like "BC" and long ones like "Delhi Amritsar" would look very different at a fixed size. Auto-sizing makes every divider balanced regardless of title length.
- **Why the white outline?** The center color is user-chosen and could be anything. A dark outline behind the text ensures it reads on both pale and medium-saturation backgrounds without requiring the user to think about contrast.
