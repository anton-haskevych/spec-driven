#!/usr/bin/env bash
# Deterministically update the `updated:` timestamp in a spec's CLAUDE.md frontmatter.
# Usage: spec-bump.sh <spec-name>
#   e.g. spec-bump.sh trial-onboarding-v2
#
# Also accepts a full path to a spec CLAUDE.md:
#   spec-bump.sh docs/specs/trial-onboarding-v2/CLAUDE.md
#
# Print the canonical timestamp without touching any file (for ledger `created:`,
# stub frontmatter, etc.):
#   spec-bump.sh --now
#
# Portable across BSD (macOS) and GNU/busybox userlands — no `sed -i`.

set -euo pipefail

now() {
  date +"%Y-%m-%dT%H:%M:%S%z" | sed 's/\([+-][0-9][0-9]\)\([0-9][0-9]\)$/\1:\2/'
}

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <spec-name|path-to-CLAUDE.md|--now>" >&2
  exit 1
fi

ARG="$1"

if [[ "$ARG" == "--now" ]]; then
  now
  exit 0
fi

# Resolve to the CLAUDE.md file — same roots `/spec list` scans:
# docs/specs/<name>/ and one level deep, */docs/specs/<name>/.
if [[ -f "$ARG" ]]; then
  FILE="$ARG"
else
  MATCHES=()
  for candidate in "docs/specs/$ARG/CLAUDE.md" */docs/specs/"$ARG"/CLAUDE.md; do
    [[ -f "$candidate" ]] && MATCHES+=("$candidate")
  done
  if [[ ${#MATCHES[@]} -eq 0 ]]; then
    echo "Error: spec '$ARG' not found in docs/specs/ or */docs/specs/" >&2
    exit 1
  fi
  if [[ ${#MATCHES[@]} -gt 1 ]]; then
    echo "Error: spec '$ARG' is ambiguous — pass the path instead:" >&2
    printf '  %s\n' "${MATCHES[@]}" >&2
    exit 1
  fi
  FILE="${MATCHES[0]}"
fi

# Check that the file has frontmatter with an updated: field
if ! grep -q '^updated:' "$FILE"; then
  echo "Warning: no 'updated:' field found in $FILE — skipping" >&2
  exit 0
fi

NOW=$(now)

# Rewrite via a temp file, then copy back over the original — keeps the file's
# inode and permissions (mktemp files are 0600; `mv` would inherit that).
TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT
awk -v now="$NOW" '/^updated:/ { print "updated: " now; next } { print }' "$FILE" > "$TMP"
cat "$TMP" > "$FILE"

echo "Updated: $FILE → $NOW"
