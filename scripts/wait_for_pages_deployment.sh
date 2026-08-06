#!/usr/bin/env bash
set -euo pipefail

# Watch the "pages build and deployment" run that GitHub starts for a gh-pages
# commit, and recover when that deployment fails.
#
# Publishing gh-pages is done by a workflow GitHub generates itself
# (dynamic/pages/pages-build-deployment), which this repository cannot
# configure. It fails from time to time for reasons unrelated to the site
# content - "Invalid actions OIDC token", "Failed to resolve action download
# info" - and nothing retries it, so the commit that was pushed silently never
# reaches the live site.
#
# Re-running the failed deployment tends to keep failing because it re-uses the
# original deployment context, so recovery here pushes an empty commit to
# gh-pages instead: that makes the Pages service start a brand new deployment
# of the same tree. The deployment is only reported as failed once recovery has
# been tried, so a real outage still turns the deploy job red instead of
# leaving a stale site behind a green check.
#
# Usage: wait_for_pages_deployment.sh <gh-pages-sha>

SHA="${1:-}"
if [ -z "$SHA" ]; then
  echo "usage: $0 <gh-pages-sha>" >&2
  exit 2
fi

API_URL="${GITHUB_API_URL:-https://api.github.com}"
REPO="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY must be set}"
TOKEN="${GH_TOKEN:?GH_TOKEN must be set}"
PAGES_WORKFLOW_PATH="dynamic/pages/pages-build-deployment"

POLL_SECONDS="${PAGES_POLL_SECONDS:-15}"
START_TIMEOUT="${PAGES_START_TIMEOUT:-180}"
RUN_TIMEOUT="${PAGES_RUN_TIMEOUT:-900}"
MAX_RECOVERIES="${PAGES_MAX_RECOVERIES:-2}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Latest Pages deployment run for a commit, as "<id> <status> <conclusion> <url>".
# Prints nothing when GitHub has not started one.
find_pages_run() {
  curl -sS \
    -H "Authorization: Bearer $TOKEN" \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "$API_URL/repos/$REPO/actions/runs?head_sha=$1&per_page=100" \
    | jq -r --arg path "$PAGES_WORKFLOW_PATH" '
        [.workflow_runs[]? | select(.path == $path)]
        | sort_by(.run_number)
        | last
        | if . == null then empty
          else "\(.id) \(.status) \(.conclusion // "none") \(.html_url)"
          end'
}

deploy_sha="$SHA"
recoveries=0

while true; do
  echo "Waiting for the GitHub Pages deployment of $deploy_sha"

  run=""
  waited=0
  while [ -z "$run" ]; do
    run="$(find_pages_run "$deploy_sha")"
    if [ -n "$run" ]; then
      break
    fi
    if [ "$waited" -ge "$START_TIMEOUT" ]; then
      echo "::warning::GitHub did not start a Pages deployment for $deploy_sha; skipping the deployment check"
      exit 0
    fi
    sleep "$POLL_SECONDS"
    waited=$(( waited + POLL_SECONDS ))
  done

  read -r _run_id status conclusion url <<<"$run"
  echo "Pages deployment: $url"

  waited=0
  while [ "$status" != "completed" ]; do
    if [ "$waited" -ge "$RUN_TIMEOUT" ]; then
      echo "::error::Timed out waiting for the Pages deployment of $deploy_sha: $url"
      exit 1
    fi
    sleep "$POLL_SECONDS"
    waited=$(( waited + POLL_SECONDS ))
    run="$(find_pages_run "$deploy_sha")"
    if [ -n "$run" ]; then
      read -r _run_id status conclusion url <<<"$run"
    fi
  done

  case "$conclusion" in
    success)
      echo "GitHub Pages published $deploy_sha"
      exit 0
      ;;
    cancelled|skipped)
      # A newer gh-pages commit superseded this deployment; that deployment
      # publishes this content too.
      echo "Pages deployment for $deploy_sha was $conclusion - a newer deployment supersedes it"
      exit 0
      ;;
  esac

  echo "::warning::Pages deployment for $deploy_sha finished with '$conclusion': $url"

  if [ "$recoveries" -ge "$MAX_RECOVERIES" ]; then
    echo "::error::GitHub Pages failed to publish the site after $MAX_RECOVERIES recovery attempts: $url"
    exit 1
  fi

  recoveries=$(( recoveries + 1 ))
  echo "Recovery $recoveries/$MAX_RECOVERIES: pushing an empty commit to start a fresh deployment"
  git commit --allow-empty -m "Retry GitHub Pages deployment ($recoveries)"
  "$SCRIPT_DIR/push_gh_pages.sh"
  deploy_sha="$(git rev-parse HEAD)"
done
