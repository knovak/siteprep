#!/usr/bin/env bash
# Advisory-only report on shared-library adoption and page navigation.
#
# This intentionally never fails the build: decks are allowed to have fully
# independent CSS/JS and to skip any shared library, so drift or divergence
# here is informational, not an error. It exists to surface things a human
# might want to double check (a deck reinventing map/gallery code, or a page
# with no way to navigate back out) without blocking anyone's experimentation.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DECKS_DIR="$ROOT_DIR/decks"

echo ""
echo "========================================="
echo "Shared library / navigation report (informational only - never fails the build)"
echo "========================================="

if [ ! -d "$DECKS_DIR" ]; then
  echo "No decks directory found; skipping report."
  exit 0
fi

mapfile -t DECKS < <(find "$DECKS_DIR" -maxdepth 1 -mindepth 1 -type d -print | sort | while read -r path; do basename "$path"; done)

echo ""
echo "-- Map / gallery library usage by deck --"
for deck in "${DECKS[@]}"; do
  deck_dir="$DECKS_DIR/$deck"
  uses_map=$(grep -rl "standard_map.js" "$deck_dir" 2>/dev/null | wc -l | tr -d ' ')
  custom_map=$(grep -rl "L\.tileLayer" "$deck_dir" 2>/dev/null | wc -l | tr -d ' ')
  uses_gallery=$(grep -rl "photo_gallery.js" "$deck_dir" 2>/dev/null | wc -l | tr -d ' ')
  custom_gallery=$(grep -rl "class=\"photo-gallery" "$deck_dir" 2>/dev/null | wc -l | tr -d ' ')

  notes=()
  if [ "$uses_map" -gt 0 ]; then
    notes+=("uses shared standard_map on $uses_map page(s)")
  fi
  if [ "$custom_map" -gt 0 ] && [ "$uses_map" -eq 0 ]; then
    notes+=("has its own Leaflet map code on $custom_map page(s), not using shared standard_map")
  fi
  if [ "$uses_gallery" -gt 0 ]; then
    notes+=("uses shared photo_gallery on $uses_gallery page(s)")
  fi
  if [ "$custom_gallery" -gt 0 ] && [ "$uses_gallery" -eq 0 ]; then
    notes+=("has its own photo-gallery markup on $custom_gallery page(s), not using shared photo_gallery")
  fi

  if [ "${#notes[@]}" -gt 0 ]; then
    joined="${notes[0]}"
    for note in "${notes[@]:1}"; do
      joined="${joined}; ${note}"
    done
    echo "  ${deck}: ${joined}"
  fi
done

echo ""
echo "-- Pages with no detected way back to the deck/home (buildBreadcrumb, footer nav, or tag-nav) --"
found_gap=0
while IFS= read -r -d '' html_file; do
  if ! grep -Eq 'buildBreadcrumb\(|<footer|class="tag-nav|class="nav"' "$html_file"; then
    echo "  ${html_file#$ROOT_DIR/}"
    found_gap=1
  fi
done < <(find "$DECKS_DIR" -name "*.html" -type f -print0 | sort -z)

if [ "$found_gap" -eq 0 ]; then
  echo "  (none)"
fi

echo ""
echo "This is a heads-up, not a failure - independent per-deck navigation and"
echo "styling is expected. Review flagged pages if the gap looks accidental."
echo "========================================="
echo ""

exit 0
