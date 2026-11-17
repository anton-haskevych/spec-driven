# Ledger Index (layout v1)

Warm cache for forward-propagating learnings. One row per ledger entry with its
`[applies-to]` scope tag. See `SKILL.md` for entry format and filtering rules.

## Gotchas
- `docs/specs/_ledger/gotcha-snapshot-on-branch-not-on-main-becomes-the-base.md` — [general] — a snapshot on the branch but not on main becomes the publish base

## Principles
- `principle-one-spec-layout.md` — [phase 2+, load-bearing] — one pure specLayout; never infer mode or record bases

## Domain

## Decisions
- `decision-spec-branch-needs-the-record.md` — [general, load-bearing] — spec-branch mode only for record-joined specs (unanswered)
- `decision-lanes-ship-with-the-spec-branch.md` — [phase 1, phase 3] — parallel lanes + feat/<spec> cut move to phase 3 (unanswered)
- `decision-final-pr-holds-by-default.md` — [phase 5, phase 6] — no ship:/pr.ship → hold-for-review (unanswered)
- `decision-main-reaches-the-spec-branch-through-lanes.md` — [phase 3+] — lanes merge main, gated; no --main

## Workarounds
