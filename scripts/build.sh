#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUTPUT_DIR="$ROOT_DIR/gh-pages"

# Get version info from environment or defaults
BRANCH_NAME="${BRANCH_NAME:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')}"
PR_NUMBER="${PR_NUMBER:-}"
VERSION_NAME="${VERSION_NAME:-$BRANCH_NAME}"

# Function to read deck metadata from deck.json
get_deck_metadata() {
  local deck_dir="$1"
  local deck_name="$2"
  local field="$3"

  local json_file="$deck_dir/deck.json"

  # If deck.json doesn't exist, return deck name as default
  if [ ! -f "$json_file" ]; then
    echo "$deck_name"
    return
  fi

  # Try to extract field from JSON using grep/sed (avoiding jq dependency)
  local value=$(grep -o "\"$field\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" "$json_file" 2>/dev/null | sed 's/.*:.*"\(.*\)".*/\1/')

  # If field not found or empty, return deck name as default
  if [ -z "$value" ]; then
    echo "$deck_name"
  else
    echo "$value"
  fi
}

# Convert a directory slug into title case for display.
titleize_slug() {
  local slug="$1"
  echo "$slug" | tr '_-' '  ' | awk '{ for (i=1; i<=NF; i++) { $i=toupper(substr($i,1,1)) substr($i,2) } print }'
}

# Percent-encode the minimal characters needed for demo directory URLs.
url_path_segment() {
  local segment="$1"
  segment="${segment//%/%25}"
  segment="${segment// /%20}"
  echo "$segment"
}

# Read the first HTML <title> value from a file, falling back to a titleized slug.
get_html_title() {
  local html_file="$1"
  local fallback_slug="$2"

  if [ -f "$html_file" ]; then
    local title
    title=$(sed -n 's/.*<title>\(.*\)<\/title>.*/\1/p' "$html_file" | head -n 1)
    if [ -n "$title" ]; then
      echo "$title"
      return
    fi
  fi

  titleize_slug "$fallback_slug"
}

# Build a concise description for a demo from README.md, the page title, or the slug.
get_demo_description() {
  local demo_dir="$1"
  local demo_name="$2"
  local demo_title="$3"

  if [ "$demo_name" = "migration_map" ]; then
    echo 'Open the World Migration Atlas demo. <a href="https://docs.google.com/presentation/d/1vz00gVdnHLOoDSidRLFgxo-UEWw4NLPZ/edit?usp=drivesdk&amp;ouid=111064312747417346604&amp;rtpof=true&amp;sd=true">Tutorial Slideshow</a> · <a href="https://drive.google.com/file/d/1PYjSLdRR1BZqGvhX4xSr-tbhfGU4liV6/view?usp=drivesdk">Tutorial as PDF</a>.'
    return
  fi

  if [ "$demo_name" = "SBDC Night Sky" ]; then
    echo 'Interactive, physics-based SBDC Night-Sky Simulator for exploring how space-based data centers would appear in the night sky. <a href="./SBDC%20Night%20Sky/index.html">current version</a> · <a href="./SBDC%20Night%20Sky/index-initial.html">initial version</a> · <a href="https://docs.google.com/presentation/d/1s5RMg8Ek9pe_ytUlJmQ_ldRwIZpm_apK7Mjhm_pCsC8/edit?usp=sharing">slideshow tutorial</a> · <a href="https://drive.google.com/drive/folders/16PhbeOYaiJ0jW0xzjBQepQEtJHVmfPRc">documentation and code folder</a>.'
    return
  fi

  if [ -f "$demo_dir/README.md" ]; then
    local readme_line
    readme_line=$(awk 'NF && $0 !~ /^#/ { print; exit }' "$demo_dir/README.md")
    if [ -n "$readme_line" ]; then
      echo "$readme_line"
      return
    fi
  fi

  if [ -f "$demo_dir/index.html" ]; then
    echo "Open the ${demo_title} demo."
  else
    echo "Browse files for the ${demo_title} demo."
  fi
}

# Return the best entry point for a demo directory.
get_demo_href() {
  local demo_dir="$1"
  local demo_name="$2"

  local encoded_demo_name
  encoded_demo_name=$(url_path_segment "$demo_name")

  if [ -f "$demo_dir/index.html" ]; then
    echo "./${encoded_demo_name}/"
  elif [ -f "$demo_dir/README.md" ]; then
    echo "./${encoded_demo_name}/README.md"
  else
    local first_file
    first_file=$(find "$demo_dir" -maxdepth 1 -type f -print | sort | head -n 1)
    if [ -n "$first_file" ]; then
      local encoded_file_name
      encoded_file_name=$(url_path_segment "$(basename "$first_file")")
      echo "./${encoded_demo_name}/${encoded_file_name}"
    else
      echo "./${encoded_demo_name}/"
    fi
  fi
}

rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# Copy source assets and decks
cp -r "$ROOT_DIR/decks" "$OUTPUT_DIR/decks"
if [ -d "$ROOT_DIR/demos" ]; then
  cp -r "$ROOT_DIR/demos" "$OUTPUT_DIR/demos"
fi
if [ -d "$ROOT_DIR/shared" ]; then
  cp -r "$ROOT_DIR/shared" "$OUTPUT_DIR/shared"
fi
if [ -d "$ROOT_DIR/shared_assets" ]; then
  cp -r "$ROOT_DIR/shared_assets" "$OUTPUT_DIR/shared_assets"
fi
cp "$ROOT_DIR/manifest.webmanifest" "$OUTPUT_DIR/manifest.webmanifest"

# Generate cache version and inject into service worker
CACHE_VERSION="v$(date +%s)"
sed "s/__CACHE_VERSION__/$CACHE_VERSION/g" "$ROOT_DIR/sw.js" > "$OUTPUT_DIR/sw.js"
if [ -d "$ROOT_DIR/pwa" ]; then
  cp -r "$ROOT_DIR/pwa" "$OUTPUT_DIR/pwa"
fi

# Discover decks and build metadata arrays
declare -A DECK_TITLES
declare -A DECK_SORT_ORDERS
declare -A DECK_DESCRIPTIONS
declare -A DECK_GROUPS

mapfile -t DECK_NAMES < <(find "$ROOT_DIR/decks" -maxdepth 1 -mindepth 1 -type d -print | while read -r path; do basename "$path"; done)

if [ "${#DECK_NAMES[@]}" -eq 0 ]; then
  echo "No decks found in $ROOT_DIR/decks"
  exit 1
fi

# Read metadata for each deck
for deck_name in "${DECK_NAMES[@]}"; do
  deck_dir="$ROOT_DIR/decks/$deck_name"
  DECK_TITLES[$deck_name]=$(get_deck_metadata "$deck_dir" "$deck_name" "title")
  DECK_SORT_ORDERS[$deck_name]=$(get_deck_metadata "$deck_dir" "$deck_name" "sort_order")
  DECK_DESCRIPTIONS[$deck_name]=$(get_deck_metadata "$deck_dir" "$deck_name" "description")
  group=$(get_deck_metadata "$deck_dir" "$deck_name" "group")
  # Default to "Current" if group is not set or equals deck_name (fallback case)
  if [ "$group" = "$deck_name" ] || [ -z "$group" ]; then
    group="Current"
  fi
  DECK_GROUPS[$deck_name]="$group"
done

# Sort decks by sort_order within each group
get_sorted_decks_for_group() {
  local target_group="$1"
  for deck_name in "${DECK_NAMES[@]}"; do
    if [ "${DECK_GROUPS[$deck_name]}" = "$target_group" ]; then
      echo "${DECK_SORT_ORDERS[$deck_name]}|$deck_name"
    fi
  done | sort | cut -d'|' -f2
}

# Get sorted decks for each group
mapfile -t CURRENT_DECKS < <(get_sorted_decks_for_group "Current")
mapfile -t FUTURE_DECKS < <(get_sorted_decks_for_group "Future")
mapfile -t OPTION_DECKS < <(get_sorted_decks_for_group "Option")
mapfile -t PAST_DECKS < <(get_sorted_decks_for_group "Past")

# All sorted decks (for backwards compatibility - used for default styles)
mapfile -t SORTED_DECKS < <(
  for deck_name in "${DECK_NAMES[@]}"; do
    echo "${DECK_SORT_ORDERS[$deck_name]}|$deck_name"
  done | sort | cut -d'|' -f2
)

# Site-level pages - the deck index, the demos index, and the version browser -
# use their own assets from shared/site_base/. They previously borrowed from
# "${SORTED_DECKS[0]}", whichever deck sorted first alphabetically, so adding or
# renaming a deck could silently change how those pages looked.
DEFAULT_STYLE="./shared/site_base/site_base.css"
DEFAULT_SCRIPT="./shared/site_base/site_base.js"

# Emit the <head> and header shared by every site-level TOC page.
#   $1 output file   $2 <title>   $3 tag label   $4 prefix to the output root
#   $5 nav button to mark as current   $6 intro paragraphs (HTML)
toc_page_open() {
  local out_file="$1" page_title="$2" tag_label="$3" prefix="$4" nav_current="$5" intro="$6"

  cat > "$out_file" <<EOF_TOC_OPEN
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page_title}</title>
  <link rel="stylesheet" href="${prefix}shared/site_base/site_base.css">
  <link rel="manifest" href="${prefix}manifest.webmanifest">
  <link rel="icon" href="${prefix}shared_assets/favicon.png" type="image/png">
  <link rel="apple-touch-icon" href="${prefix}shared_assets/icon-192.png">
  <meta name="theme-color" content="#1e3a8a">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="apple-mobile-web-app-title" content="SitePrep">
  <script defer src="${prefix}shared/site_base/site_base.js" data-nav-current="${nav_current}"></script>
</head>
<body>
  <header class="card">
    <div class="card-header">
      <p class="tag">${tag_label}</p>
      <h1>${page_title}</h1>
    </div>
    <div class="card-content">
${intro}
    </div>
  </header>
EOF_TOC_OPEN
}

# Close a site-level TOC page opened by toc_page_open.
toc_page_close() {
  cat >> "$1" <<'EOF_TOC_CLOSE'
</body>
</html>
EOF_TOC_CLOSE
}

# Function to render a deck group section
render_deck_group() {
  local group_name="$1"
  shift
  local decks=("$@")

  # Only render if there are decks in this group
  if [ "${#decks[@]}" -eq 0 ]; then
    return
  fi

  cat >> "$OUTPUT_DIR/index.html" <<EOF_HTML
  <main class="card" aria-labelledby="deck-list-${group_name,,}">
    <div class="card-header">
      <h2 id="deck-list-${group_name,,}">${group_name}</h2>
    </div>
    <div class="card-content">
      <ul class="toc-grid">
EOF_HTML

  for deck in "${decks[@]}"; do
    title="${DECK_TITLES[$deck]}"
    description="${DECK_DESCRIPTIONS[$deck]}"

    cat >> "$OUTPUT_DIR/index.html" <<EOF_HTML
        <li class="toc-item">
          <a href="./decks/${deck}/index.html" class="toc-link">
            <h3>${title}</h3>
            <p>${description}</p>
          </a>
        </li>
EOF_HTML
  done

  cat >> "$OUTPUT_DIR/index.html" <<'EOF_HTML'
      </ul>
    </div>
  </main>
EOF_HTML
}

toc_page_open "$OUTPUT_DIR/index.html" "SitePrep Decks" "Root Index" "./" "home" \
'      <p>Browse available decks generated by the SitePrep experiment. Content is organized by deck, section, and individual pages.</p>
      <p style="margin-top: 1rem;"><a href="./index-versions.html">View all versions (including PR previews)</a></p>'

# Render each group in order: Current, Future, Option, Past
render_deck_group "Current" "${CURRENT_DECKS[@]}"
render_deck_group "Future" "${FUTURE_DECKS[@]}"
render_deck_group "Option" "${OPTION_DECKS[@]}"
render_deck_group "Past" "${PAST_DECKS[@]}"

cat >> "$OUTPUT_DIR/index.html" <<'EOF_HTML'
  <main class="card" aria-labelledby="demo-list-title">
    <div class="card-header">
      <h2 id="demo-list-title">Demos</h2>
      <p class="meta">Standalone demo sites are published in parallel with decks.</p>
    </div>
    <div class="card-content">
      <p><a href="./demos/index.html">Browse all demos</a></p>
    </div>
  </main>
EOF_HTML

toc_page_close "$OUTPUT_DIR/index.html"

# Generate demos index without modifying copied demo files.
if [ -d "$ROOT_DIR/demos" ]; then
  mapfile -t DEMO_NAMES < <(find "$ROOT_DIR/demos" -maxdepth 1 -mindepth 1 -type d -print | sort | while read -r path; do basename "$path"; done)
  mkdir -p "$OUTPUT_DIR/demos"

  toc_page_open "$OUTPUT_DIR/demos/index.html" "SitePrep Demos" "Demos Index" "../" "demos" \
'      <p>Browse standalone demo directories published alongside SitePrep decks.</p>
      <p><a href="../index.html">Return to SitePrep home</a></p>'

  cat >> "$OUTPUT_DIR/demos/index.html" <<'EOF_DEMOS'
  <main class="card" aria-labelledby="demo-list">
    <div class="card-header">
      <h2 id="demo-list">Demos</h2>
    </div>
    <div class="card-content">
      <ul class="toc-grid">
EOF_DEMOS

  for demo in "${DEMO_NAMES[@]}"; do
    demo_dir="$ROOT_DIR/demos/$demo"
    title=$(get_html_title "$demo_dir/index.html" "$demo")
    description=$(get_demo_description "$demo_dir" "$demo" "$title")
    href=$(get_demo_href "$demo_dir" "$demo")

    prompts_link=""
    if [ -f "$demo_dir/prompts.txt" ]; then
      encoded_demo=$(url_path_segment "$demo")
      if [ -f "$demo_dir/prompts.html" ]; then
        prompts_link="          <p class=\"meta\"><a href=\"./${encoded_demo}/prompts.html\">Prompt history</a> (<a href=\"./${encoded_demo}/prompts.txt\">text</a>)</p>"
      else
        prompts_link="          <p class=\"meta\"><a href=\"./${encoded_demo}/prompts.txt\">Prompt history</a></p>"
      fi
    fi

    cat >> "$OUTPUT_DIR/demos/index.html" <<EOF_DEMO_ITEM
        <li class="toc-item">
          <a href="${href}" class="toc-link">
            <h3>${title}</h3>
          </a>
          <p>${description}</p>
${prompts_link}
        </li>
EOF_DEMO_ITEM
  done

  cat >> "$OUTPUT_DIR/demos/index.html" <<'EOF_DEMOS'
      </ul>
    </div>
  </main>
EOF_DEMOS
  toc_page_close "$OUTPUT_DIR/demos/index.html"
fi

# Create a placeholder index-versions.html (will be replaced during deployment)
cat > "$OUTPUT_DIR/index-versions.html" <<EOF_VERSIONS
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SitePrep - All Versions</title>
  <link rel="stylesheet" href="$DEFAULT_STYLE">
</head>
<body>
  <header class="card">
    <div class="card-header">
      <a href="index-versions.html" class="tag">Version Browser</a>
      <h1>SitePrep - All Versions</h1>
    </div>
    <div class="card-content">
      <p>This page lists all available versions including PR previews.</p>
      <p>The full versions index is generated during deployment to GitHub Pages.</p>
      <p><a href="./index.html">Return to main index</a></p>
    </div>
  </header>
</body>
</html>
EOF_VERSIONS

# Function to inject version footer into HTML files
inject_version_footer() {
  local html_file="$1"

  # Calculate relative path from this HTML file to the root
  local rel_path=$(realpath --relative-to="$(dirname "$html_file")" "$OUTPUT_DIR")
  if [ "$rel_path" = "." ]; then
    rel_path=""
  else
    rel_path="$rel_path/"
  fi

  # Declare where the root of this deployment is - "" at the root, "../../" from
  # a section, and so on. The build knows this exactly; client-side code that
  # tries to work it out from the URL cannot tell a branch preview apart from
  # the main site outside of decks/. See shared/nav_bar/nav_bar.md.
  if ! grep -q 'name="siteprep-version-root"' "$html_file"; then
    local meta_tmp="${html_file}.meta.tmp"
    awk -v root="$rel_path" '
      !done && /<head>/ {
        print
        print "  <meta name=\"siteprep-version-root\" content=\"" root "\">"
        done = 1
        next
      }
      { print }
    ' "$html_file" > "$meta_tmp"
    mv "$meta_tmp" "$html_file"
  fi

  # Determine page context (root, deck, or section)
  local file_rel_path="${html_file#$OUTPUT_DIR/}"
  local page_type="root"
  local deck_path=""
  local section_path=""

  if [[ "$file_rel_path" =~ ^decks/([^/]+)/sections/([^/]+)/ ]]; then
    page_type="section"
    deck_path="../../index.html"
    section_path="overview.html"
  elif [[ "$file_rel_path" =~ ^decks/([^/]+)/index\.html$ ]]; then
    page_type="deck"
    deck_path="index.html"
  fi

  # Create footer HTML with JavaScript for dynamic rendering
  local footer_html="  <footer class=\"site-footer\">\n"
  footer_html="${footer_html}    <script>\n"
  footer_html="${footer_html}      (function() {\n"
  footer_html="${footer_html}        var footer = document.currentScript.parentElement;\n"
  footer_html="${footer_html}        var nav = document.createElement('div');\n"
  footer_html="${footer_html}        nav.className = 'footer-nav';\n"
  footer_html="${footer_html}        var links = [];\n"
  footer_html="${footer_html}        \n"
  footer_html="${footer_html}        // Version link to home\n"
  footer_html="${footer_html}        links.push({ href: '${rel_path}index.html', text: 'Version: $VERSION_NAME' });\n"
  footer_html="${footer_html}        \n"

  # Add deck link if applicable
  if [ "$page_type" = "deck" ] || [ "$page_type" = "section" ]; then
    footer_html="${footer_html}        // Deck link\n"
    footer_html="${footer_html}        links.push({ href: '${deck_path}', text: 'Deck' });\n"
    footer_html="${footer_html}        \n"
  fi

  # Add section link if applicable
  if [ "$page_type" = "section" ]; then
    footer_html="${footer_html}        // Section link\n"
    footer_html="${footer_html}        links.push({ href: '${section_path}', text: 'Section' });\n"
    footer_html="${footer_html}        \n"
  fi

  # Add Google Drive and View all versions links
  footer_html="${footer_html}        // Google Drive link\n"
  footer_html="${footer_html}        links.push({ href: 'https://drive.google.com/drive/folders/1BDF-8Vz_8P5PIH_78GikTFfYA_ZtOoUS?usp=drive_link', text: 'Google Drive', external: true });\n"
  footer_html="${footer_html}        \n"
  footer_html="${footer_html}        // View all versions link\n"
  footer_html="${footer_html}        links.push({ href: '${rel_path}index-versions.html', text: 'View all versions' });\n"
  footer_html="${footer_html}        \n"
  footer_html="${footer_html}        // Build the navigation\n"
  footer_html="${footer_html}        links.forEach(function(link, index) {\n"
  footer_html="${footer_html}          if (index > 0) {\n"
  footer_html="${footer_html}            var sep = document.createElement('span');\n"
  footer_html="${footer_html}            sep.className = 'footer-separator';\n"
  footer_html="${footer_html}            sep.textContent = '|';\n"
  footer_html="${footer_html}            nav.appendChild(sep);\n"
  footer_html="${footer_html}          }\n"
  footer_html="${footer_html}          var a = document.createElement('a');\n"
  footer_html="${footer_html}          a.href = link.href;\n"
  footer_html="${footer_html}          a.textContent = link.text;\n"
  footer_html="${footer_html}          if (link.external) a.target = '_blank';\n"
  footer_html="${footer_html}          nav.appendChild(a);\n"
  footer_html="${footer_html}        });\n"
  footer_html="${footer_html}        \n"
  footer_html="${footer_html}        footer.appendChild(nav);\n"
  footer_html="${footer_html}      })();\n"
  footer_html="${footer_html}    </script>\n"
  footer_html="${footer_html}  </footer>"

  # Insert footer immediately before the closing body tag.
  # Split the line at </body> rather than printing the footer above the whole
  # line: pages that close an inline <script> on the same line as </body> would
  # otherwise get the footer markup injected inside that still-open script,
  # which breaks the script with a syntax error.
  if grep -q "</body>" "$html_file"; then
    # Use a temporary file to avoid in-place editing issues
    local tmp_file="${html_file}.tmp"
    awk -v footer="$footer_html" '
      !injected && index($0, "</body>") {
        idx = index($0, "</body>")
        before = substr($0, 1, idx - 1)
        if (before != "") print before
        print footer
        print substr($0, idx)
        injected = 1
        next
      }
      { print }
    ' "$html_file" > "$tmp_file"
    mv "$tmp_file" "$html_file"
  fi
}

# Inject version info into all HTML files
echo "Injecting version info into HTML files..."
while IFS= read -r -d '' html_file; do
  file_rel_path="${html_file#$OUTPUT_DIR/}"
  if [[ "$file_rel_path" == demos/* && "$file_rel_path" != "demos/index.html" ]]; then
    continue
  fi
  inject_version_footer "$html_file"
done < <(find "$OUTPUT_DIR" -name "*.html" -type f -print0)

"$ROOT_DIR/scripts/build_tests.sh"

# Informational only - reports on shared-library adoption and page navigation
# without ever failing the build (decks are free to diverge from both).
"$ROOT_DIR/scripts/audit_shared_usage.sh"

printf 'Build complete. Output stored in %s\n' "$OUTPUT_DIR"
printf 'Version: %s (Branch: %s)\n' "$VERSION_NAME" "$BRANCH_NAME"
