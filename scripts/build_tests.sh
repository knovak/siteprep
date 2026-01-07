#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUTPUT_DIR="$ROOT_DIR/gh-pages"

fail() {
  echo "BUILD-TEST FAIL: $1" >&2
  exit 1
}

pass() {
  echo "BUILD-TEST PASS: $1"
}

if [ ! -d "$OUTPUT_DIR" ]; then
  fail "BUILD-02 output directory missing: $OUTPUT_DIR"
fi
pass "BUILD-02 output directory exists"

if [ ! -f "$OUTPUT_DIR/index.html" ]; then
  fail "BUILD-04 root index missing"
fi
pass "BUILD-04 root index generated"

if [ ! -f "$OUTPUT_DIR/manifest.webmanifest" ]; then
  fail "BUILD-06 manifest.webmanifest missing"
fi

if [ ! -f "$OUTPUT_DIR/sw.js" ]; then
  fail "BUILD-06 sw.js missing"
fi
pass "BUILD-06 PWA files copied"

mapfile -t DECKS < <(find "$ROOT_DIR/decks" -maxdepth 1 -mindepth 1 -type d -print | sort | while read -r path; do basename "$path"; done)

if [ "${#DECKS[@]}" -eq 0 ]; then
  fail "BUILD-03 no decks found to validate"
fi

for deck in "${DECKS[@]}"; do
  deck_index="$OUTPUT_DIR/decks/${deck}/index.html"
  if [ ! -f "$deck_index" ]; then
    fail "BUILD-03 deck HTML missing: $deck_index"
  fi
  pass "BUILD-03 deck HTML generated for ${deck}"

  if ! grep -q "./decks/${deck}/index.html" "$OUTPUT_DIR/index.html"; then
    fail "BUILD-04 root index missing link for ${deck}"
  fi
  pass "BUILD-04 root index links ${deck}"

  assets_dir="$OUTPUT_DIR/decks/${deck}/assets"
  if [ ! -d "$assets_dir" ]; then
    fail "BUILD-05 assets directory missing for ${deck}"
  fi

  if [ ! -f "$assets_dir/styles.css" ] || [ ! -f "$assets_dir/scripts.js" ]; then
    fail "BUILD-05 assets missing for ${deck}"
  fi
  pass "BUILD-05 assets copied for ${deck}"
done

if [ -d "$ROOT_DIR/pwa" ]; then
  if [ ! -d "$OUTPUT_DIR/pwa" ]; then
    fail "BUILD-07 pwa output directory missing"
  fi
  pass "BUILD-07 PWA icons directory copied"
fi

pass "Build-time test sample complete"
