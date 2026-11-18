# Ledger Index (layout v1)

Warm cache for forward-propagating learnings. One row per ledger entry with its
`[applies-to]` scope tag. See `SKILL.md` for entry format and filtering rules.

## Gotchas
- `docs/specs/_ledger/gotcha-snapshot-on-branch-not-on-main-becomes-the-base.md` — [general] — a snapshot on the branch but not on main becomes the publish base
- `docs/specs/_ledger/gotcha-a-registered-plan-runner-is-queueable.md` — [general] — a registered plan runner is queueable; never-queued writes use writeRecord

## Principles
- `principle-one-spec-layout.md` — [phase 2+, load-bearing] — one pure specLayout + branchOf; never infer mode or bases
- `principle-close-out-reads-the-record.md` — [phase 4, phase 5] — merged back = recorded commit in feat/<spec>; no subjects

## Domain

## Decisions
- `decision-spec-branch-needs-the-record.md` — [general, load-bearing] — spec-branch mode only for record-joined specs (unanswered)
- `decision-lanes-ship-with-the-spec-branch.md` — [phase 1, phase 3] — parallel lanes + feat/<spec> cut move to phase 3 (unanswered)
- `decision-final-pr-holds-by-default.md` — [phase 5, phase 6] — no ship:/pr.ship → hold-for-review (unanswered)
- `decision-main-reaches-the-spec-branch-through-lanes.md` — [phase 3+] — lanes merge main, gated; no --main
- `decision-spec-branch-mode-starts-and-ends-in-one-record-write.md` — [phase 3, phase 5, load-bearing] — specBranchPlan on; prSyncPlan off
- `decision-cross-lane-needs-wait-for-close-out.md` — [phase 3, phase 4] — a need on another lane waits for its close-out
- `decision-docs-reach-spec-branch-through-main.md` — [phase 3+] — snapshot reaches feat/<spec> via main; no 2nd push
- `decision-ship-alone-freeze-is-a-plan-rule.md` — [phase 3+] — no phase moves into/out of a ship-alone group in the mode

## Workarounds
