#!/usr/bin/env bash
set -euo pipefail

# Push the current gh-pages checkout to origin, retrying when another
# deployment pushed first. Deployments for different branches run
# concurrently and each one commits to gh-pages, so a plain push can be
# rejected as non-fast-forward.
#
# Deployments touch disjoint directories (the site root for main, one
# branch/<name> directory per preview), so replaying this commit on top of the
# other deployment is safe. The only shared file is the generated
# index-versions.html; conflicts there resolve in favour of this deployment and
# the next deployment regenerates the file from the directories that exist.

ATTEMPTS="${GH_PAGES_PUSH_ATTEMPTS:-5}"

for attempt in $(seq 1 "$ATTEMPTS"); do
  if git push origin HEAD:gh-pages; then
    exit 0
  fi

  echo "Push attempt $attempt/$ATTEMPTS failed; replaying onto the latest gh-pages"
  git fetch origin gh-pages
  if ! git rebase -X theirs origin/gh-pages; then
    git rebase --abort || true
    echo "::warning::Could not replay this deployment onto the latest gh-pages"
  fi
  sleep $(( attempt * 3 ))
done

echo "::error::Unable to push to gh-pages after $ATTEMPTS attempts"
exit 1
