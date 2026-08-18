#!/usr/bin/env bash
set -euo pipefail

source_dir="${1:?usage: prepare-static-site.sh SOURCE_DIR INIT_SITE_SCRIPT}"
init_site_script="${2:?usage: prepare-static-site.sh SOURCE_DIR INIT_SITE_SCRIPT}"

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
skill_dir="$(cd "$script_dir/.." && pwd)"
asset_dir="$skill_dir/assets"

test -d "$source_dir" || { echo "Source directory does not exist: $source_dir" >&2; exit 2; }
source_dir="$(cd "$source_dir" && pwd -P)"
test -f "$source_dir/index.html" || { echo "Source directory must contain a root index.html" >&2; exit 2; }
test ! -L "$source_dir/index.html" || { echo "index.html must not be a symlink" >&2; exit 2; }
test -x "$init_site_script" || { echo "Sites initializer is not executable: $init_site_script" >&2; exit 2; }
command -v rsync >/dev/null || { echo "rsync is required to prepare the static assets" >&2; exit 2; }
command -v git >/dev/null || { echo "git is required to prepare the Sites source repository" >&2; exit 2; }

work_dir="$(mktemp -d /tmp/chatgpt-sites-deploy.XXXXXX)"
work_dir="$(cd "$work_dir" && pwd -P)"
project_dir="$work_dir/project"
archive_path="$work_dir/site-package.tgz"

cleanup_on_error() {
  local status=$?
  if [[ $status -ne 0 && -d "$work_dir" ]]; then
    "$script_dir/cleanup-deployment-workspace.sh" "$work_dir" || true
  fi
  exit "$status"
}
trap cleanup_on_error EXIT

symlink_path="$(find "$source_dir" -type l -print -quit)"
if [[ -n "$symlink_path" ]]; then
  echo "Refusing to publish a directory containing symlinks: $symlink_path" >&2
  exit 2
fi

secret_path="$(find "$source_dir" -type f \( \
  -name '.env' -o -name '.env.*' -o -name '.npmrc' -o -name '.pypirc' -o \
  -name 'id_rsa' -o -name 'id_ed25519' -o -name '*.pem' -o -name '*.key' \
  \) -print -quit)"
if [[ -n "$secret_path" ]]; then
  echo "Refusing to publish a directory containing a secret-like file: $secret_path" >&2
  exit 2
fi

"$init_site_script" "$project_dir"

project_dir="$(cd "$project_dir" && pwd -P)"
git_root="$(git -C "$project_dir" rev-parse --show-toplevel)"
if [[ "$git_root" != "$project_dir" ]]; then
  echo "Sites staging project is not an isolated Git repository" >&2
  exit 2
fi

find "$project_dir/public" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
rm -rf \
  "$project_dir/app/_sites-preview" \
  "$project_dir/db" \
  "$project_dir/drizzle" \
  "$project_dir/examples" \
  "$project_dir/tests"
rm -f \
  "$project_dir/app/chatgpt-auth.ts" \
  "$project_dir/drizzle.config.ts" \
  "$project_dir/README.md" \
  "$project_dir/server.test.mjs"

rsync -a \
  --exclude '/.openai/' \
  --exclude '/.git/' \
  --exclude '/node_modules/' \
  --exclude '/.DS_Store' \
  "$source_dir/" "$project_dir/public/"

install -m 0644 "$asset_dir/static-worker.ts" "$project_dir/worker/index.ts"
install -m 0644 "$asset_dir/static-page.tsx" "$project_dir/app/page.tsx"
install -m 0644 "$asset_dir/static-layout.tsx" "$project_dir/app/layout.tsx"
install -m 0644 "$asset_dir/static-globals.css" "$project_dir/app/globals.css"

(
  cd "$project_dir"
  npm uninstall react-loading-skeleton --ignore-scripts --no-audit --no-fund >/dev/null
)

for ignored_path in node_modules dist .vinext .wrangler; do
  if ! git -C "$project_dir" check-ignore -q --no-index "$ignored_path/.isolation-check"; then
    echo "Generated path is not ignored in the isolated repository: $ignored_path" >&2
    exit 2
  fi
done

static_file_count="$(find "$project_dir/public" -type f | wc -l | tr -d ' ')"
static_size_kib="$(du -sk "$project_dir/public" | awk '{print $1}')"

trap - EXIT
printf 'WORK_DIR=%s\n' "$work_dir"
printf 'PROJECT_DIR=%s\n' "$project_dir"
printf 'ARCHIVE_PATH=%s\n' "$archive_path"
printf 'STATIC_FILE_COUNT=%s\n' "$static_file_count"
printf 'STATIC_SIZE_KIB=%s\n' "$static_size_kib"
