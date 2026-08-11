#!/usr/bin/env python3
"""Keep every published spec-driven version declaration in sync."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
CLAUDE_MANIFEST = ROOT / ".claude-plugin" / "plugin.json"
CODEX_MANIFEST = ROOT / ".codex-plugin" / "plugin.json"
MARKETPLACE = ROOT / ".claude-plugin" / "marketplace.json"


def read_json(path: Path) -> dict:
    return json.loads(path.read_text())


def write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, indent=2) + "\n")


def declared_versions() -> dict[str, str]:
    marketplace = read_json(MARKETPLACE)
    plugin = next(item for item in marketplace["plugins"] if item["name"] == "spec-driven")
    return {
        str(CLAUDE_MANIFEST.relative_to(ROOT)): read_json(CLAUDE_MANIFEST)["version"],
        str(CODEX_MANIFEST.relative_to(ROOT)): read_json(CODEX_MANIFEST)["version"],
        str(MARKETPLACE.relative_to(ROOT)): plugin["version"],
    }


def set_version(version: str) -> None:
    for path in (CLAUDE_MANIFEST, CODEX_MANIFEST):
        manifest = read_json(path)
        manifest["version"] = version
        write_json(path, manifest)

    marketplace = read_json(MARKETPLACE)
    plugin = next(item for item in marketplace["plugins"] if item["name"] == "spec-driven")
    plugin["version"] = version
    write_json(MARKETPLACE, marketplace)


def check_versions() -> None:
    versions = declared_versions()
    if len(set(versions.values())) != 1:
        details = "\n".join(f"  {path}: {version}" for path, version in versions.items())
        raise SystemExit(f"Version declarations disagree:\n{details}")
    print(f"All version declarations match: {next(iter(versions.values()))}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--set", dest="version", help="Set every version declaration")
    args = parser.parse_args()
    if args.version:
        set_version(args.version)
    check_versions()


if __name__ == "__main__":
    main()
