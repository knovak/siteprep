#!/usr/bin/env bash
set -euo pipefail

OUTPUT_DIR="${1:?Usage: $0 <output_dir> <root_dir>}"
ROOT_DIR="${2:?Usage: $0 <output_dir> <root_dir>}"

log() {
  printf '\n[build-test] %s\n' "$1"
}

assert_file() {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    printf '[build-test] Expected file to exist: %s\n' "$file" >&2
    exit 1
  fi
}

assert_dir() {
  local dir="$1"
  if [[ ! -d "$dir" ]]; then
    printf '[build-test] Expected directory to exist: %s\n' "$dir" >&2
    exit 1
  fi
}

assert_contains() {
  local file="$1"
  local needle="$2"
  if ! rg -F --quiet "$needle" "$file"; then
    printf '[build-test] Expected "%s" to contain "%s"\n' "$file" "$needle" >&2
    exit 1
  fi
}

log "BUILD-02: Output directory exists"
assert_dir "$OUTPUT_DIR"

log "BUILD-03: Deck HTML generated"
mapfile -t DECKS < <(find "$ROOT_DIR/decks" -maxdepth 1 -mindepth 1 -type d -print | sort | while read -r path; do basename "$path"; done)
for deck in "${DECKS[@]}"; do
  assert_file "$OUTPUT_DIR/decks/$deck/index.html"
done

log "BUILD-04: Root index lists all decks"
assert_file "$OUTPUT_DIR/index.html"
for deck in "${DECKS[@]}"; do
  assert_contains "$OUTPUT_DIR/index.html" "./decks/$deck/index.html"
done

log "BUILD-05: Deck assets copied"
for deck in "${DECKS[@]}"; do
  assert_file "$OUTPUT_DIR/decks/$deck/assets/styles.css"
  assert_file "$OUTPUT_DIR/decks/$deck/assets/scripts.js"
done

log "BUILD-06: PWA files copied"
assert_file "$OUTPUT_DIR/manifest.webmanifest"
assert_file "$OUTPUT_DIR/sw.js"

log "BUILD-08: Service worker registration present"
for deck in "${DECKS[@]}"; do
  assert_contains "$OUTPUT_DIR/decks/$deck/assets/scripts.js" "navigator.serviceWorker.register"
done

log "Build-time tests completed successfully"
