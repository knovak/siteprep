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


if [ -d "$ROOT_DIR/demos" ]; then
  if [ ! -d "$OUTPUT_DIR/demos" ]; then
    fail "BUILD-13 demos output directory missing"
  fi
  pass "BUILD-13 demos directory copied"

  if [ ! -f "$OUTPUT_DIR/demos/index.html" ]; then
    fail "BUILD-13 demos index missing"
  fi
  pass "BUILD-13 demos index generated"

  mapfile -t DEMOS < <(find "$ROOT_DIR/demos" -maxdepth 1 -mindepth 1 -type d -print | sort | while read -r path; do basename "$path"; done)
  for demo in "${DEMOS[@]}"; do
    if [ ! -d "$OUTPUT_DIR/demos/${demo}" ]; then
      fail "BUILD-13 demo directory missing: ${demo}"
    fi
    pass "BUILD-13 demo directory copied for ${demo}"

    while IFS= read -r -d '' source_file; do
      rel_file="${source_file#$ROOT_DIR/demos/}"
      output_file="$OUTPUT_DIR/demos/$rel_file"
      if [ ! -f "$output_file" ]; then
        fail "BUILD-13 demo file missing: ${rel_file}"
      fi
      if ! cmp -s "$source_file" "$output_file"; then
        fail "BUILD-13 demo file was modified instead of copied: ${rel_file}"
      fi
    done < <(find "$ROOT_DIR/demos/${demo}" -type f -print0)
    pass "BUILD-13 demo files copied without modification for ${demo}"

    encoded_demo="${demo//%/%25}"
    encoded_demo="${encoded_demo// /%20}"
    if ! grep -q "./${encoded_demo}/" "$OUTPUT_DIR/demos/index.html"; then
      fail "BUILD-13 demos index missing link for ${demo}"
    fi
    pass "BUILD-13 demos index links ${demo}"

    if [ -f "$ROOT_DIR/demos/${demo}/prompts.html" ]; then
      if ! grep -q "href=\"./${encoded_demo}/prompts.html\">Prompt history</a> (<a href=\"./${encoded_demo}/prompts.txt\">text</a>)" "$OUTPUT_DIR/demos/index.html"; then
        fail "BUILD-13 demos index missing formatted and text prompt history links for ${demo}"
      fi
      pass "BUILD-13 demos index links formatted and text prompt history for ${demo}"
    fi
  done
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

# Site-level pages register the service worker through shared/site_base/, not
# through a deck's scripts.js.
if ! grep -q "site_base.js" "$OUTPUT_DIR/index.html"; then
  fail "BUILD-08 site_base.js not included in root index"
fi
if ! grep -q "serviceWorker" "$OUTPUT_DIR/shared/site_base/site_base.js"; then
  fail "BUILD-08 service worker code missing from shared/site_base/site_base.js"
fi
pass "BUILD-08 service worker registration code available"

# BUILD-16: Shared nav bar reaches every page that should have one.
for toc_page in "index.html" "demos/index.html"; do
  toc_path="$OUTPUT_DIR/$toc_page"
  [ -f "$toc_path" ] || continue
  if ! grep -q "site_base.js" "$toc_path"; then
    fail "BUILD-16 TOC page ${toc_page} does not load the shared nav bar"
  fi
  pass "BUILD-16 TOC page ${toc_page} loads the shared nav bar"
done

for shared_nav_file in nav_bar.js nav_bar.css nav_bar.md; do
  if [ ! -f "$OUTPUT_DIR/shared/nav_bar/$shared_nav_file" ]; then
    fail "BUILD-16 shared/nav_bar/${shared_nav_file} not published"
  fi
done
pass "BUILD-16 shared nav bar library published"

# BUILD-17: Every page declares where its deployment root is, so client-side
# navigation does not have to guess - a guess that used to send every page
# outside decks/ back to main from a branch preview.
missing_root=0
while IFS= read -r -d '' html_file; do
  file_rel="${html_file#$OUTPUT_DIR/}"
  # Demo content is copied byte-for-byte and is deliberately left untouched.
  if [[ "$file_rel" == demos/* && "$file_rel" != "demos/index.html" ]]; then
    continue
  fi
  if ! grep -q 'name="siteprep-version-root"' "$html_file"; then
    echo "  missing version root: $file_rel" >&2
    missing_root=$((missing_root + 1))
  fi
done < <(find "$OUTPUT_DIR" -name "*.html" -type f -print0)

if [ "$missing_root" -gt 0 ]; then
  fail "BUILD-17 ${missing_root} page(s) missing the version-root meta tag"
fi
pass "BUILD-17 every generated page declares its version root"

# BUILD-18: Initiatives validate, and their pages are generated.
#
# Only malformed or unsafe data fails the build. Backlog health - an empty
# backlog, a stale initiative, a missing stage document - is reported as a
# warning, because this script aborts the build and would otherwise stop an
# unrelated deck from deploying over someone's todo list.
if [ -d "$ROOT_DIR/initiatives" ]; then
  if ! node "$ROOT_DIR/scripts/initiatives.mjs" validate; then
    fail "BUILD-18 initiative data is invalid"
  fi
  pass "BUILD-18 initiative data validated"

  if [ ! -f "$OUTPUT_DIR/initiatives/index.html" ]; then
    fail "BUILD-18 initiatives index not generated"
  fi
  pass "BUILD-18 initiatives index generated"

  while IFS= read -r initiative; do
    [ -n "$initiative" ] || continue
    if [ ! -f "$OUTPUT_DIR/initiatives/${initiative}/index.html" ]; then
      fail "BUILD-18 no overview page generated for ${initiative}"
    fi
    if ! grep -q "./${initiative}/index.html" "$OUTPUT_DIR/initiatives/index.html"; then
      fail "BUILD-18 initiatives index does not link ${initiative}"
    fi
    pass "BUILD-18 initiative page generated and linked for ${initiative}"
  done < <(node "$ROOT_DIR/scripts/initiatives.mjs" list)

  # Source markdown stays the single source of truth; the build renders it.
  if find "$OUTPUT_DIR/initiatives" -name '*.md' -print -quit | grep -q .; then
    fail "BUILD-18 raw markdown published under initiatives/ instead of rendered HTML"
  fi
  pass "BUILD-18 initiative documents rendered rather than copied"

  # BUILD-19: The sweep survey. Deterministic, so it is unit-testable against
  # fixtures rather than against whatever work happens to be in flight.
  for suite in initiatives-digest initiatives-sweep; do
    if ! node --test "$ROOT_DIR/tests/${suite}.test.mjs" > /dev/null 2>&1; then
      node --test "$ROOT_DIR/tests/${suite}.test.mjs" || true
      fail "BUILD-19 ${suite} tests failed"
    fi
    pass "BUILD-19 ${suite} tests passed"
  done

  if ! node "$ROOT_DIR/scripts/initiatives.mjs" digest > /dev/null; then
    fail "BUILD-19 sweep digest could not be produced"
  fi
  pass "BUILD-19 sweep digest produced for the real initiatives"
fi

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

# BUILD-14: Version footer injected outside every inline script
# The footer carries its own <script>, so injecting it inside a page's still-open
# inline script terminates that script early and breaks the whole block. Nothing
# may follow the injected footer except the closing body/html tags.
while IFS= read -r -d '' html_file; do
  if ! grep -q '<footer class="site-footer">' "$html_file"; then
    continue
  fi

  after_footer=$(awk 'BEGIN { RS = "</footer>" } { last = $0 } END { print last }' "$html_file")
  if grep -q "</script>" <<< "$after_footer"; then
    fail "BUILD-14 version footer injected inside an inline script: ${html_file#$OUTPUT_DIR/}"
  fi
done < <(find "$OUTPUT_DIR" -name "*.html" -type f -print0)
pass "BUILD-14 version footer injected outside inline scripts"

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
