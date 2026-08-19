#!/usr/bin/env python3
"""Copy a repository folder into demos/ and write its Demo TOC metadata."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import NoReturn
from urllib.parse import urlsplit


def fail(message: str) -> NoReturn:
    raise ValueError(message)


def single_line(value: str, label: str) -> str:
    value = value.strip()
    if not value:
        fail(f"{label} must not be empty")
    if any(character in value for character in "\r\n\0"):
        fail(f"{label} must be a single line")
    return value


def safe_relative(value: str, label: str) -> Path:
    value = single_line(value, label)
    if "\\" in value:
        fail(f"{label} must use forward slashes")
    if any(part in ("", ".", "..") for part in value.split("/")):
        fail(f"{label} must be a safe relative path")
    candidate = Path(value)
    if candidate.is_absolute():
        fail(f"{label} must be a safe relative path")
    return candidate


def is_within(path: Path, parent: Path) -> bool:
    try:
        path.relative_to(parent)
        return True
    except ValueError:
        return False


def discover_repo_root() -> Path:
    result = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"],
        check=True,
        capture_output=True,
        text=True,
    )
    return Path(result.stdout.strip()).resolve()


def validate_local_target(source: Path, target: str, label: str) -> str:
    parsed = urlsplit(target)
    if parsed.scheme or parsed.netloc:
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            fail(f"link target for {label!r} must be a local file or an http(s) URL")
        return target

    local_path = safe_relative(parsed.path, f"link target for {label!r}")
    full_path = source / local_path
    if not full_path.is_file():
        fail(f"local link target does not exist in the source: {target}")
    return target


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, help="source directory inside the repository")
    parser.add_argument("--destination", required=True, help="one folder name directly under demos/")
    parser.add_argument("--title", required=True, help="Demo TOC title")
    parser.add_argument("--description", required=True, help="Demo TOC description")
    parser.add_argument("--root-html", help="root HTML path relative to the source")
    parser.add_argument(
        "--link",
        action="append",
        default=[],
        nargs=2,
        metavar=("LABEL", "TARGET"),
        help="optional Demo TOC link; repeat for multiple links",
    )
    parser.add_argument("--repo-root", help=argparse.SUPPRESS)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    repo_root = Path(args.repo_root).resolve() if args.repo_root else discover_repo_root()
    demos_dir = repo_root / "demos"
    if not demos_dir.is_dir():
        fail(f"demo collection does not exist: {demos_dir}")

    source = Path(args.source)
    if not source.is_absolute():
        source = repo_root / source
    source = source.resolve()
    if not source.is_dir():
        fail(f"source directory does not exist: {source}")
    if not is_within(source, repo_root):
        fail("source directory must be inside the repository")

    destination_name = single_line(args.destination, "destination name")
    if destination_name in (".", "..") or destination_name.startswith("."):
        fail("destination name must be a visible folder name")
    if "/" in destination_name or "\\" in destination_name:
        fail("destination name must name one immediate folder under demos/")
    destination = (demos_dir / destination_name).resolve()
    if destination.parent != demos_dir.resolve():
        fail("destination must be one immediate folder under demos/")
    if is_within(destination, source) or is_within(source, destination):
        fail("source and destination must not overlap")
    if destination.exists() and not destination.is_dir():
        fail(f"destination exists but is not a directory: {destination}")

    title = single_line(args.title, "title")
    description = single_line(args.description, "description")

    if args.root_html:
        if "?" in args.root_html or "#" in args.root_html:
            fail("root HTML must be a file path without a query or fragment")
        root_html = safe_relative(args.root_html, "root HTML")
    elif (source / "index.html").is_file():
        root_html = Path("index.html")
    else:
        fail("source has no top-level index.html; provide --root-html")
    if root_html.suffix.lower() not in (".html", ".htm"):
        fail("root HTML must identify an .html or .htm file")
    if not (source / root_html).is_file():
        fail(f"root HTML does not exist in the source: {root_html.as_posix()}")

    links = []
    seen_labels = set()
    for raw_label, raw_target in args.link:
        label = single_line(raw_label, "link label")
        target = single_line(raw_target, f"link target for {label!r}")
        if label in seen_labels:
            fail(f"duplicate link label: {label}")
        seen_labels.add(label)
        links.append({"label": label, "href": validate_local_target(source, target, label)})

    manifest = {
        "title": title,
        "description": description,
        "root": root_html.as_posix(),
        "links": links,
    }

    staging_root = Path(tempfile.mkdtemp(prefix=f".deploy-demo-{destination_name}-", dir=repo_root))
    staged_demo = staging_root / "payload"
    backup = staging_root / "previous"
    replaced = destination.exists()
    try:
        shutil.copytree(source, staged_demo, symlinks=True, copy_function=shutil.copy2)
        (staged_demo / "demo.json").write_text(
            json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )

        if replaced:
            os.replace(destination, backup)
        try:
            os.replace(staged_demo, destination)
        except Exception:
            if replaced and backup.exists() and not destination.exists():
                os.replace(backup, destination)
            raise
        if backup.exists():
            shutil.rmtree(backup)
    finally:
        if staging_root.exists():
            shutil.rmtree(staging_root)

    action = "Replaced" if replaced else "Created"
    print(f"{action} {destination}")
    print(f"Root HTML: {root_html.as_posix()}")
    print(f"Demo TOC links: {len(links)}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, subprocess.CalledProcessError, ValueError) as error:
        print(f"deploy-demo: {error}", file=sys.stderr)
        raise SystemExit(2)
