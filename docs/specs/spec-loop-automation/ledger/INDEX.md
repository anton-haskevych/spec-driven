# Ledger Index (layout v1)

Warm cache for forward-propagating learnings. One row per ledger entry with its
`[applies-to]` scope tag. See `SKILL.md` for entry format and filtering rules.

## Gotchas
- `gotcha-locate-spec-file-needs-absolute-paths.md` — [phase 1, 7, 8] — git prints relative paths; join onto repo root first
- `gotcha-deployed-marker-goes-after-the-pointer.md` — [phase 2] — reader only sees `· deployed` right after the pointer
- `docs/specs/_ledger/gotcha-bun-test-runs-in-utc-but-spawned-children-do-not.md` — [general] — bun test is UTC; spawned children aren't

## Principles
- `principle-writers-plan-validate-then-apply.md` — [phase 2+] — whole EditPlan, checked in-process, one applier

## Domain

## Decisions
- `decision-publish-docs-snapshot-merge.md` — [phase 7, load-bearing] — snapshot commit + merge-tree + merge-back (probe-verified)
- `decision-phase-ids-never-retire.md` — [phase 1, 3] — split keeps the original id; `comparePhaseIds` orders letters
- `decision-parse-prose-stays-as-fallback.md` — [phase 1] — SKILL.md parse rules stay, aligned with the tool
- `decision-bash-writes-denied-not-swept.md` — [phase 8] — PreToolUse deny on write signals, no mtime sweep

## Workarounds
