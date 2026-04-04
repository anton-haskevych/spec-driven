#!/usr/bin/env bash
# Deterministically update the `updated:` timestamp in a spec's CLAUDE.md frontmatter.
# Usage: spec-bump.sh <spec-name>
#   e.g. spec-bump.sh trial-onboarding-v2
#
# Also accepts a full path to a spec CLAUDE.md:
#   spec-bump.sh docs/specs/trial-onboarding-v2/CLAUDE.md

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <spec-name|path-to-CLAUDE.md>" >&2
  exit 1
fi

ARG="$1"

# Resolve to the CLAUDE.md file
if [[ -f "$ARG" ]]; then
  FILE="$ARG"
elif [[ -f "docs/specs/$ARG/CLAUDE.md" ]]; then
  FILE="docs/specs/$ARG/CLAUDE.md"
else
  echo "Error: spec '$ARG' not found in docs/specs/" >&2
  exit 1
fi

# Generate ISO 8601 timestamp with timezone offset
NOW=$(date +"%Y-%m-%dT%H:%M:%S%z" | sed 's/\([+-][0-9][0-9]\)\([0-9][0-9]\)$/\1:\2/')

# Check that the file has frontmatter with an updated: field
if ! grep -q '^updated:' "$FILE"; then
  echo "Warning: no 'updated:' field found in $FILE — skipping" >&2
  exit 0
fi

# Replace the updated: line (macOS sed)
sed -i '' "s|^updated:.*|updated: $NOW|" "$FILE"

echo "Updated: $FILE → $NOW"
