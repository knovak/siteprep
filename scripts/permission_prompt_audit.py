#!/usr/bin/env python3
"""Report which tool calls needed a permission prompt across recent Claude Code chats.

Run this on the machine where the chats actually happened. Claude Code keeps one
JSONL transcript per session under ~/.claude/projects/<slugified-cwd>/, and those
files are the only record of what got asked. Sessions that ran in an ephemeral
remote container (Claude Code on the web, GitHub Actions) leave nothing behind
once the container is reclaimed, so this can only see local history.

    ./scripts/permission_prompt_audit.py                 # last 10 sessions for this repo
    ./scripts/permission_prompt_audit.py -n 25           # last 25 sessions
    ./scripts/permission_prompt_audit.py --project ~/src/other-repo
    ./scripts/permission_prompt_audit.py --json          # machine-readable

A note on what is and isn't knowable from a transcript: a *denial* is recorded
verbatim, because the rejection comes back as the tool result. An *approval* is
not - an allowed call looks identical to one that never needed asking. So the
report separates the two: denials are counted exactly, and prompts are inferred
by replaying each call against the permission rules in your settings files and
the session's permission mode. Read the inferred column as "would have prompted
unless you'd already clicked Always allow", which is why the allowlist column
matters - a rule sitting in settings.local.json is usually the fossil of a
prompt you got tired of seeing.
"""

from __future__ import annotations

import argparse
import fnmatch
import json
import os
import re
import shlex
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

# Tools that never trigger a permission prompt: they only read, search, or drive
# Claude's own bookkeeping. Anything not listed here is treated as promptable.
NEVER_PROMPTS = {
    "Read", "Glob", "Grep", "LS", "NotebookRead", "TodoWrite", "TodoRead",
    "Task", "Agent", "ToolSearch", "Skill", "AskUserQuestion", "ExitPlanMode",
    "EnterPlanMode", "ReportFindings", "ScheduleWakeup", "TaskCreate",
    "TaskUpdate", "TaskList", "TaskGet", "TaskOutput", "TaskStop",
    "ListSkills", "ListPlugins", "ListMcpResourcesTool", "SearchSkills",
}

# Tools whose permission rule is scoped to a file path rather than the tool name.
FILE_TOOLS = {"Edit", "Write", "NotebookEdit", "MultiEdit"}

# Sub-commands worth keeping in the permission key, because `git` alone is too
# coarse to be a useful rule - `git push` and `git status` are not the same ask.
TWO_WORD_TOOLS = {
    "git", "gh", "npm", "npx", "pnpm", "yarn", "cargo", "go", "docker",
    "kubectl", "terraform", "aws", "gcloud", "brew", "pip", "pip3", "poetry",
    "uv", "bundle", "rake", "make", "systemctl", "apt", "apt-get",
}

# Text Claude Code puts in the tool result when a human says no. Matching any of
# these means a prompt definitely appeared and was definitely declined.
DENIAL_PATTERNS = [
    re.compile(p, re.IGNORECASE) for p in (
        r"user doesn't want to proceed with this tool use",
        r"user doesn't want to take this action",
        r"the tool use was rejected",
        r"user rejected .{0,40}(edit|write|command|tool)",
        r"user denied permission",
        r"request interrupted by user for tool use",
        r"permission to use .{0,60} was denied",
    )
]

# Leading tokens that wrap the real command without changing what's being asked.
COMMAND_WRAPPERS = {"sudo", "time", "env", "nohup", "command", "exec", "xargs"}

# Shell grammar, not commands - these must never become permission keys.
SHELL_KEYWORDS = {
    "if", "then", "else", "elif", "fi", "for", "while", "until", "do", "done",
    "case", "esac", "function", "select", "in", "{", "}", "(", ")", "[[", "]]",
}

# Keywords that open a construct whose header holds no command of its own -
# `for f in /etc/*` names a loop variable, not a program to ask permission for.
CONSTRUCT_HEADS = {"for", "while", "until", "case", "if", "elif", "select", "function"}

# Keywords that merely precede the real command inside a construct.
CONSTRUCT_LEADINS = {"then", "do", "else", "{", "("}

# Redirections carry no command name: `2>/dev/null` must not read as `null`.
REDIRECT = re.compile(r"^\d*(?:>>|>|<<<|<<|<)&?")


def split_commands(raw: str) -> list[str]:
    """Split a shell line on ; && || | while respecting quotes and substitutions.

    A naive regex split mangles anything with an operator inside a quoted
    argument - a grep pattern like '"a|b"' would come back as two commands.
    """
    parts: list[str] = []
    buf: list[str] = []
    quote: str | None = None
    depth = 0
    i = 0
    while i < len(raw):
        ch = raw[i]
        if quote:
            buf.append(ch)
            if ch == "\\" and quote == '"' and i + 1 < len(raw):
                buf.append(raw[i + 1])
                i += 2
                continue
            if ch == quote:
                quote = None
            i += 1
            continue
        if ch in ("'", '"'):
            quote = ch
            buf.append(ch)
            i += 1
            continue
        if ch == "\\" and i + 1 < len(raw):
            buf.append(ch)
            buf.append(raw[i + 1])
            i += 2
            continue
        # Track $( ) and ` ` so operators nested inside stay with their command.
        if raw.startswith("$(", i):
            depth += 1
            buf.append(raw[i:i + 2])
            i += 2
            continue
        if ch == ")" and depth:
            depth -= 1
            buf.append(ch)
            i += 1
            continue
        if depth == 0:
            if raw.startswith("&&", i) or raw.startswith("||", i):
                parts.append("".join(buf))
                buf = []
                i += 2
                continue
            if ch in ("|", ";", "\n"):
                parts.append("".join(buf))
                buf = []
                i += 1
                continue
        buf.append(ch)
        i += 1
    parts.append("".join(buf))
    return [p.strip() for p in parts if p.strip()]


def slugify_project_path(path: Path) -> str:
    """Match Claude Code's transcript directory naming for a working directory."""
    return re.sub(r"[^a-zA-Z0-9]", "-", str(path.resolve()))


def find_transcript_dir(project: Path, explicit: Path | None) -> Path:
    if explicit:
        if not explicit.is_dir():
            sys.exit(f"error: --transcripts {explicit} is not a directory")
        return explicit

    root = Path.home() / ".claude" / "projects"
    if not root.is_dir():
        sys.exit(
            f"error: no transcript store at {root}\n"
            "Claude Code has not run on this machine, or history lives under a "
            "different HOME. Point at it with --transcripts."
        )

    candidate = root / slugify_project_path(project)
    if candidate.is_dir():
        return candidate

    # The slug rules have changed across versions; fall back to a suffix match
    # on the project's directory name so an older layout still resolves.
    tail = re.sub(r"[^a-zA-Z0-9]", "-", project.resolve().name)
    matches = [d for d in root.iterdir() if d.is_dir() and d.name.endswith(tail)]
    if len(matches) == 1:
        return matches[0]
    if matches:
        sys.exit(
            "error: several transcript directories could match this project:\n  "
            + "\n  ".join(str(m) for m in matches)
            + "\nPick one with --transcripts."
        )
    sys.exit(
        f"error: no transcripts found for {project.resolve()}\n"
        f"Looked for {candidate}. Available projects:\n  "
        + "\n  ".join(sorted(d.name for d in root.iterdir() if d.is_dir()))
    )


def load_allow_rules(project: Path) -> dict[str, list[str]]:
    """Collect permission rules from every settings file that applies here."""
    sources = {
        "project": project / ".claude" / "settings.json",
        "project-local": project / ".claude" / "settings.local.json",
        "user": Path.home() / ".claude" / "settings.json",
        "user-local": Path.home() / ".claude" / "settings.local.json",
    }
    rules: dict[str, list[str]] = {}
    for label, path in sources.items():
        if not path.is_file():
            continue
        try:
            data = json.loads(path.read_text())
        except (json.JSONDecodeError, OSError):
            continue
        allow = (data.get("permissions") or {}).get("allow") or []
        if allow:
            rules[label] = allow
    return rules


def iter_transcripts(directory: Path, limit: int) -> list[Path]:
    files = [p for p in directory.glob("*.jsonl") if p.is_file()]
    files.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    return files[:limit]


def command_key(raw: str) -> list[str]:
    """Reduce a shell command to the permission keys it would be matched against."""
    keys: list[str] = []
    for part in split_commands(raw):
        try:
            tokens = shlex.split(part)
        except ValueError:
            tokens = part.split()
        # Strip redirections wherever they appear; they name no program.
        tokens = [t for t in tokens if not REDIRECT.match(t)]
        # Drop lead-ins, VAR=value assignments, and wrappers like `sudo`.
        while tokens and (re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*=.*", tokens[0])
                          or tokens[0] in COMMAND_WRAPPERS
                          or tokens[0] in CONSTRUCT_LEADINS):
            tokens.pop(0)
        # A construct header (`for f in ...`) runs nothing by itself.
        if not tokens or tokens[0] in CONSTRUCT_HEADS:
            continue
        if tokens[0] in SHELL_KEYWORDS:
            continue
        head = os.path.basename(tokens[0])
        if not head or head.startswith("-") or head in SHELL_KEYWORDS:
            continue
        if head in TWO_WORD_TOOLS:
            sub = next((t for t in tokens[1:] if not t.startswith("-")), None)
            keys.append(f"Bash({head} {sub})" if sub else f"Bash({head})")
        else:
            keys.append(f"Bash({head})")
    # One prompt per tool call, so a command that runs `ls` twice still asks once.
    return list(dict.fromkeys(keys)) or ["Bash(?)"]


def tool_keys(name: str, tool_input: dict) -> list[str]:
    """The permission key(s) a single tool call would be checked against."""
    if name == "Bash":
        return command_key(str(tool_input.get("command", "")))
    if name in FILE_TOOLS:
        path = tool_input.get("file_path") or tool_input.get("notebook_path") or "?"
        return [f"{name}({path})"]
    if name == "WebFetch":
        url = str(tool_input.get("url", ""))
        host = re.sub(r"^https?://([^/]+).*$", r"\1", url) or "?"
        return [f"WebFetch(domain:{host})"]
    return [name]


def rule_matches(key: str, rule: str) -> bool:
    """Approximate Claude Code's rule matching closely enough to spot coverage."""
    if rule == key:
        return True
    # Bare tool name in the rule covers every use of that tool.
    if "(" not in rule and key.split("(")[0] == rule:
        return True
    if "(" in rule and "(" in key:
        rule_tool, rule_arg = rule.split("(", 1)
        key_tool, key_arg = key.split("(", 1)
        if rule_tool != key_tool:
            return False
        return fnmatch.fnmatch(key_arg.rstrip(")"), rule_arg.rstrip(")"))
    return False


def covered_by(key: str, rules: dict[str, list[str]]) -> str | None:
    for label, patterns in rules.items():
        for rule in patterns:
            if rule_matches(key, rule):
                return label
    return None


def text_of(content) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return " ".join(
            block.get("text", "") if isinstance(block, dict) else str(block)
            for block in content
        )
    return ""


def parse_session(path: Path) -> dict:
    """Pull tool calls, their results, and the permission mode out of one transcript."""
    calls: dict[str, dict] = {}
    order: list[str] = []
    mode = "default"
    started: str | None = None

    with path.open(encoding="utf-8", errors="replace") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue

            if started is None and entry.get("timestamp"):
                started = entry["timestamp"]
            if entry.get("permissionMode"):
                mode = entry["permissionMode"]

            message = entry.get("message") or {}
            content = message.get("content")
            if not isinstance(content, list):
                continue

            for block in content:
                if not isinstance(block, dict):
                    continue
                if block.get("type") == "tool_use":
                    uid = block.get("id") or f"anon-{len(order)}"
                    calls[uid] = {
                        "name": block.get("name", "?"),
                        "input": block.get("input") or {},
                        "denied": False,
                    }
                    order.append(uid)
                elif block.get("type") == "tool_result":
                    uid = block.get("tool_use_id")
                    if uid not in calls:
                        continue
                    body = text_of(block.get("content"))
                    if any(p.search(body) for p in DENIAL_PATTERNS):
                        calls[uid]["denied"] = True

    return {
        "path": path,
        "session_id": path.stem,
        "started": started,
        "mode": mode,
        "calls": [calls[uid] for uid in order],
    }


def build_report(sessions: list[dict], rules: dict[str, list[str]]) -> list[dict]:
    stats: dict[str, dict] = defaultdict(
        lambda: {"calls": 0, "denials": 0, "sessions": set(), "tool": "", "examples": []}
    )

    for session in sessions:
        # bypassPermissions suppresses prompting wholesale; acceptEdits only
        # covers file edits. Both change what would actually have been asked.
        bypass = session["mode"] == "bypassPermissions"
        accept_edits = session["mode"] == "acceptEdits"

        for call in session["calls"]:
            name = call["name"]
            if name in NEVER_PROMPTS:
                continue
            for key in tool_keys(name, call["input"]):
                row = stats[key]
                row["tool"] = name
                row["calls"] += 1
                row["sessions"].add(session["session_id"])
                if call["denied"]:
                    row["denials"] += 1
                if bypass or (accept_edits and name in FILE_TOOLS):
                    row.setdefault("suppressed", 0)
                    row["suppressed"] = row.get("suppressed", 0) + 1
                if name == "Bash" and len(row["examples"]) < 3:
                    cmd = str(call["input"].get("command", "")).replace("\n", " ")
                    row["examples"].append(cmd[:90])

    report = []
    for key, row in stats.items():
        allowed_by = covered_by(key, rules)
        suppressed = row.get("suppressed", 0)
        # Calls that could not have been silently permitted by a rule or mode.
        inferred = 0 if allowed_by else max(row["calls"] - suppressed, 0)
        report.append({
            "key": key,
            "tool": row["tool"],
            "calls": row["calls"],
            "denials": row["denials"],
            "sessions": len(row["sessions"]),
            "allowlisted_in": allowed_by,
            "inferred_prompts": inferred,
            "examples": row["examples"],
        })

    report.sort(key=lambda r: (-r["denials"], -r["inferred_prompts"], -r["calls"], r["key"]))
    return report


def fmt_when(stamp: str | None) -> str:
    if not stamp:
        return "unknown"
    try:
        dt = datetime.fromisoformat(stamp.replace("Z", "+00:00"))
        return dt.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    except ValueError:
        return stamp[:19]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("-n", "--sessions", type=int, default=10,
                    help="how many of the most recent sessions to read (default 10)")
    ap.add_argument("--project", type=Path, default=Path.cwd(),
                    help="project directory whose chats to audit (default: cwd)")
    ap.add_argument("--transcripts", type=Path, default=None,
                    help="read transcripts from this directory instead of resolving one")
    ap.add_argument("--json", action="store_true", help="emit JSON instead of a table")
    args = ap.parse_args()

    directory = find_transcript_dir(args.project, args.transcripts)
    files = iter_transcripts(directory, args.sessions)
    if not files:
        sys.exit(f"error: no .jsonl transcripts in {directory}")

    rules = load_allow_rules(args.project)
    sessions = [parse_session(p) for p in files]
    report = build_report(sessions, rules)

    if args.json:
        print(json.dumps({
            "transcript_dir": str(directory),
            "sessions": [
                {"id": s["session_id"], "started": s["started"], "mode": s["mode"],
                 "tool_calls": len(s["calls"])}
                for s in sessions
            ],
            "requests": report,
        }, indent=2))
        return 0

    print(f"\nTranscripts: {directory}")
    print(f"Sessions read: {len(sessions)} (most recent first)\n")
    for s in sessions:
        print(f"  {fmt_when(s['started']):>20}  {s['session_id'][:8]}  "
              f"mode={s['mode']:<18} {len(s['calls'])} tool calls")

    if rules:
        print("\nPermission rules already in effect:")
        for label, patterns in rules.items():
            print(f"  [{label}] {', '.join(patterns)}")
    else:
        print("\nPermission rules already in effect: none found")

    total_denials = sum(r["denials"] for r in report)
    total_inferred = sum(r["inferred_prompts"] for r in report)

    print(f"\n{'request type':<44} {'calls':>6} {'sess':>5} {'denied':>7} "
          f"{'prompted*':>10}  allowlisted")
    print("-" * 96)
    for r in report:
        allow = r["allowlisted_in"] or "-"
        print(f"{r['key'][:44]:<44} {r['calls']:>6} {r['sessions']:>5} "
              f"{r['denials']:>7} {r['inferred_prompts']:>10}  {allow}")

    print("-" * 96)
    print(f"{'TOTAL':<44} {sum(r['calls'] for r in report):>6} {'':>5} "
          f"{total_denials:>7} {total_inferred:>10}")
    print("\n* 'denied' is exact - the refusal is recorded in the transcript.")
    print("  'prompted' is inferred: calls no rule or permission mode could have")
    print("  covered, so each would have asked unless you clicked Always allow.")

    noisy = [r for r in report if r["tool"] == "Bash" and r["examples"]
             and r["inferred_prompts"] >= 3]
    if noisy:
        print("\nMost repeated Bash asks, with examples:")
        for r in noisy[:8]:
            print(f"  {r['key']} ({r['inferred_prompts']}x)")
            for ex in r["examples"]:
                print(f"      {ex}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
