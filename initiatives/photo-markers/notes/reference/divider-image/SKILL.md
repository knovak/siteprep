---
name: divider-image
description: Generate a square circular "donut" divider image — black corners, a bold solid-colored ring, a light pastel center circle, and a large bold title centered inside — saved as a JPEG with EXIF date/time metadata so it sorts correctly inside a photo collection (e.g. Apple Photos, Google Photos, Lightroom). Use this whenever the user wants a divider, section marker, title card, or chapter image to insert between groups of photos, or mentions making a "donut" image, a colored ring/circle graphic with text, or a labeled divider for a trip/album/collection. Trigger even if they don't say "divider" explicitly — e.g. "make an image that says Paris to split up my photos" or "I need a title card for this section of my album."
---

# Divider Image

Creates square JPEG divider images for inserting between groups of photos in a
collection: black corners, a bold solid color ring (the "donut") that touches
all four edges of the square, and a light pastel center circle with a large
bold title.

## When to use this

Use this skill any time the user wants a labeled divider/title-card image for
a photo collection — even if they just describe the visual (a colored ring
with text in the middle) rather than naming the skill.

## How to generate an image

Run the bundled script:

```
python3 scripts/generate_divider.py "TITLE" [options] -o output.jpg
```

Map the user's request to flags:
- The title text is the only required argument.
- `--corner`, `--donut`, `--center` set the three colors (outside-in). Defaults are black / red / light green, matching the original reference design. The donut should always be specified as a bold/solid color; the center should always be light/pastel — if the user asks for an unusual combination (e.g. a pastel donut), still honor it, but default to bold-ring/pastel-center when they don't specify.
- `--date` (YYYY-MM-DD, defaults to today) and `--time` (HH:MM, defaults to 00:00) control the EXIF date/time written into the JPEG — this is what makes the divider sort correctly alongside real photos.
- `--output`/`-o` sets the destination path. Default size is 2000x2000px (`--size` to change).

Example matching "make an image dated 2025-12-17 with a pink center and title Breckenridge":

```
python3 scripts/generate_divider.py "Breckenridge" --center pink --date 2025-12-17 -o breckenridge.jpg
```

Dependencies: `Pillow` and `piexif` (`pip install Pillow piexif --break-system-packages` if missing). The script auto-detects a bold system font; pass `--font /path/to/font.ttf` if none is found.

After generating, present the resulting JPEG to the user — they'll want to see it before dropping it into their photo collection. See `README.md` for the full flag reference and friendly color names (pink, light green, light blue, peach, lavender, cream, mint, butter).
