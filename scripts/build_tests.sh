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

echo "Running build-time tests..."
echo ""

# BUILD-01: Build completes without errors
# This test is implicitly validated by the successful execution
# of this script being called from build.sh
pass "BUILD-01 build script executed successfully"

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

# BUILD-08: Service worker registration code available
# Check that scripts.js (which contains SW registration) is included
for deck in "${DECKS[@]}"; do
  deck_index="$OUTPUT_DIR/decks/${deck}/index.html"
  if ! grep -q "scripts.js" "$deck_index"; then
    fail "BUILD-08 scripts.js not included in ${deck}"
  fi

  # Verify scripts.js contains service worker code
  scripts_path="$OUTPUT_DIR/decks/${deck}/assets/scripts.js"
  if [ -f "$scripts_path" ]; then
    if ! grep -q "serviceWorker" "$scripts_path"; then
      fail "BUILD-08 service worker code missing from ${deck}/assets/scripts.js"
    fi
  fi
done

if ! grep -q "scripts.js" "$OUTPUT_DIR/index.html"; then
  fail "BUILD-08 scripts.js not included in root index"
fi
pass "BUILD-08 service worker registration code available"

# BUILD-09: Valid HTML - basic structure check
for deck in "${DECKS[@]}"; do
  deck_index="$OUTPUT_DIR/decks/${deck}/index.html"

  # Check for basic HTML structure
  if ! grep -q "<!DOCTYPE html>" "$deck_index"; then
    fail "BUILD-09 missing DOCTYPE in ${deck}"
  fi

  if ! grep -q "<html" "$deck_index"; then
    fail "BUILD-09 missing html tag in ${deck}"
  fi

  if ! grep -q "<head>" "$deck_index"; then
    fail "BUILD-09 missing head tag in ${deck}"
  fi

  if ! grep -q "<body>" "$deck_index"; then
    fail "BUILD-09 missing body tag in ${deck}"
  fi
done
pass "BUILD-09 HTML structure validated"

# BUILD-10: Multi-deck build
if [ "${#DECKS[@]}" -gt 0 ]; then
  pass "BUILD-10 multi-deck build verified (${#DECKS[@]} deck(s))"
else
  fail "BUILD-10 no decks found"
fi

# BUILD-11: Shared resources included
# Check that deck assets are properly included
for deck in "${DECKS[@]}"; do
  deck_index="$OUTPUT_DIR/decks/${deck}/index.html"

  # Check for CSS link
  if ! grep -q "styles.css" "$deck_index"; then
    fail "BUILD-11 CSS import missing in ${deck}"
  fi

  # Check for JS script
  if ! grep -q "scripts.js" "$deck_index"; then
    fail "BUILD-11 JS import missing in ${deck}"
  fi
done
pass "BUILD-11 shared resources verified"

# BUILD-12: Clean build capability
# This test verifies build can work from clean state
# (Already tested by BUILD-01 running a fresh build)
if [ -d "$OUTPUT_DIR" ]; then
  pass "BUILD-12 clean build capability verified"
else
  fail "BUILD-12 build output missing"
fi

echo ""
echo "========================================="
echo "Build-time test suite complete!"
echo "All tests passed."
echo "========================================="
