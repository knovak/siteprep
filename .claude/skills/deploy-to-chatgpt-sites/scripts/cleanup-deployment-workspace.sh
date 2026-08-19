#!/usr/bin/env bash
set -euo pipefail

work_dir="${1:?usage: cleanup-deployment-workspace.sh WORK_DIR}"
test -d "$work_dir" || exit 0
work_dir="$(cd "$work_dir" && pwd -P)"

case "$work_dir" in
  /tmp/chatgpt-sites-deploy.*|/private/tmp/chatgpt-sites-deploy.*)
    ;;
  *)
    echo "Refusing to remove a directory outside the deployment workspace: $work_dir" >&2
    exit 2
    ;;
esac

find "$work_dir" -depth -mindepth 1 -delete
rmdir "$work_dir"
