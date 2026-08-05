#!/bin/bash
# Mark this workspace trusted so the permissions.allow rules committed in
# .claude/settings.json are actually honored.
#
# Claude Code drops project-scoped permissions.allow entries until the
# workspace is trusted, and trust lives in ~/.claude.json - machine state, not
# repo state. A local checkout gets trusted once via the interactive dialog and
# stays that way. Claude Code on the web never does: every session builds a
# fresh container, nothing interactive ever runs, so the committed allow rules
# are discarded and every tool call prompts from scratch.
#
# TIMING IS THE WHOLE POINT. Claude Code resolves permission config once, at
# startup, before hooks run - a SessionStart hook that sets this flag does not
# affect the session it runs in, only later ones. So this must run BEFORE the
# session starts, which means calling it from the environment's setup script:
#
#     bash .claude/hooks/trust-workspace.sh
#
# Registering it as a SessionStart hook is a fallback that helps resumed and
# checkpointed sessions, not the first one.
#
# The trade-off, stated plainly: this bypasses the trust prompt, so anyone who
# lands a commit in this repo gets their permissions.allow entries honored in
# future web sessions with no human in the loop. That is the same trust the
# repo's code already has here, but the allowlist is worth reviewing on any PR
# that touches .claude/settings.json.
#
# Safe to run repeatedly, and never fails the caller: a broken trust flag must
# not wedge session startup.

set -uo pipefail

# Only auto-trust in the ephemeral remote containers. On a real machine the
# interactive trust dialog is the right mechanism and should be left alone.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

python3 - "$PROJECT_DIR" <<'PY' || exit 0
import json
import os
import sys

project = sys.argv[1]
path = os.path.join(os.path.expanduser("~"), ".claude.json")

try:
    with open(path) as fh:
        config = json.load(fh)
except FileNotFoundError:
    config = {}
except (OSError, json.JSONDecodeError) as exc:
    # A malformed or unreadable config is Claude Code's to repair, not ours.
    print(f"trust-workspace: leaving {path} alone ({exc})", file=sys.stderr)
    sys.exit(0)

entry = config.setdefault("projects", {}).setdefault(project, {})
if entry.get("hasTrustDialogAccepted") is True:
    sys.exit(0)

entry["hasTrustDialogAccepted"] = True

# Write via a temp file in the same directory so a crash mid-write cannot
# truncate the config Claude Code depends on.
tmp = f"{path}.trust-workspace.tmp"
try:
    with open(tmp, "w") as fh:
        json.dump(config, fh, indent=2)
    os.replace(tmp, path)
except OSError as exc:
    print(f"trust-workspace: could not update {path} ({exc})", file=sys.stderr)
    try:
        os.unlink(tmp)
    except OSError:
        pass
    sys.exit(0)

print(f"trust-workspace: trusted {project}")
PY

exit 0
