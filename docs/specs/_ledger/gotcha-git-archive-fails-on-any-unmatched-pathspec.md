---
kind: gotcha
paths: [skills/spec/tools/mainline/**]
created: 2026-10-01T14:12:52-07:00
seen-in: [spec-board]
---

# `git archive` fails when any one pathspec matches nothing: pass only patterns that match

`git archive <sha> -- <p1> <p2>` exits 128 (`pathspec '<p2>' did not match any files`) if a single
pattern is empty, so the two-root read set (`docs/specs/…` and `*/docs/specs/…`) breaks every repo
that has only one root. `ls-tree` rejects `:(glob)` magic, so it can't pre-check. List the tree once
(`git ls-tree -r --name-only -z <sha>`), keep the patterns that match a path (`Bun.Glob`, whose `*`
stops at `/` like `:(glob)`), and archive with those; none → nothing to archive.

Why it bites: a fixture repo with both roots passes. Probed 2026-10-01 in spec-board phase 1 preflight.
Extract the tar with `Bun.Archive` (handles git's pax header and UTF-8); no `tar` CLI needed.
