# Ledger Index (layout v1)

Warm cache for forward-propagating learnings. One row per ledger entry with its
`[applies-to]` scope tag. See `SKILL.md` for entry format and filtering rules.

## Gotchas
- `docs/specs/_ledger/gotcha-snapshot-on-branch-not-on-main-becomes-the-base.md` — [general] — a snapshot on the branch but not on main becomes the publish base
- `docs/specs/_ledger/gotcha-a-registered-plan-runner-is-queueable.md` — [general] — a registered plan runner is queueable; never-queued writes use writeRecord
- `docs/specs/_ledger/gotcha-fast-crew-tests-use-crew-fake-deps.md` — [general] — fast crew tests use fastCrewDeps (crew-fake-deps.ts), not crew-deps.ts
- `docs/specs/_ledger/gotcha-trees-place-reads-pr-group-from-base.md` — [general] — trees place reads pr: from main; a branch-only regroup is ignored
- `docs/specs/_ledger/gotcha-claim-take-refuses-when-another-tree-holds-the-same-ticks.md` — [general] — claim take refuses when another tree holds the same ticks
- `gotcha-crew-check-reads-no-record.md` — [phase 6] — crew check runs today's close-out; only the tick is lane-aware

## Principles
- `principle-one-spec-layout.md` — [phase 2+, load-bearing] — one pure specLayout + branchOf; never infer mode or bases
- `principle-close-out-reads-the-record.md` — [phase 4, phase 5] — merged back = recorded commit in feat/<spec>; no subjects

## Domain

## Decisions
- `decision-spec-branch-needs-the-record.md` — [general, load-bearing] — spec-branch mode only for record-joined specs (unanswered)
- `decision-lanes-ship-with-the-spec-branch.md` — [phase 1, phase 3] — phase 1 ships with phase 3 in PR C; lanes switch on with phase 3
- `decision-final-pr-holds-by-default.md` — [phase 5, phase 6] — no ship:/pr.ship → hold-for-review (unanswered)
- `decision-main-reaches-the-spec-branch-through-lanes.md` — [phase 3+] — lanes merge main, gated; no --main
- `decision-spec-branch-mode-starts-and-ends-in-one-record-write.md` — [phase 3, phase 5, load-bearing] — specBranchPlan on; prSyncPlan off
- `decision-cross-lane-needs-wait-for-close-out.md` — [phase 3, phase 4] — a need on another lane waits for its close-out
- `decision-docs-reach-spec-branch-through-main.md` — [phase 3+] — snapshot reaches feat/<spec> via main; no 2nd push
- `decision-ship-alone-freeze-is-a-plan-rule.md` — [phase 3+] — no phase moves into/out of a ship-alone group in the mode
- `decision-a-spec-run-finishes-only-after-an-empty-tick.md` — [phase 1, phase 5, phase 6] — finished needs Launched empty at tick start (PR moment)
- `decision-prune-reads-the-lane-document-number.md` — [phase 5] — lane doc merged needs its number; prSyncPlan must copy it
- `decision-machine-limit-lives-in-launch.md` — [phase 1, phase 3, phase 6] — 6-worker refusal in launchCrewSession; relaunch: true exempt

## Workarounds
