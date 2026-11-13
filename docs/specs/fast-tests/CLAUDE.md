---
created: 2026-11-13T15:05:10-08:00
updated: 2026-11-13T15:25:29-08:00
status: draft
area: [tools, tests]
domain: [spec-workflow]
scope: [improvement, refactor]
related:
  - live-board: its phases added most of the real-git command tests; it also edits record/ref.ts, fake-record.ts, read-plans.ts and phase-writer.ts
  - spec-loop-automation: edits tests/git-repo.ts
  - pr-babysit: edits core/land-on-main.ts, which phase 3 gives an injectable land function
---

# Fast Tests Spec

## Files

| File | Purpose |
|------|---------|
| `seed.md` | Origin record: spun off from live-board phase 10a |
| `product-brief.md` | Business intent from prep |
| `design.md` | The rule, the decisions, how the guard and the two speeds behave |
| `technical.md` | Seams, fakes, contract suite, guard, gate — contracts and file tree |
| `progress.md` | Thin index of phases (checkboxes + pointers) |
| `pr-opening.md` | PR-readiness gate — spec state + pre-PR checks (not a phase) |
| `code-map.md` | Load-bearing files inventory |
| `phases/` | Per-phase detail — one entry per phase |
| `ledger/INDEX.md` | Forward-propagating learnings — scan here first |
| `in-flight/` | Ephemeral pending state, one file per phase (on-demand) |
| `research/` | Prep snapshots: wave 0 (timings, council), wave 1 (seams, inventory), craft |

## Relationship to code

This spec is a *design document*, not a live mirror. Ground truth:
- `skills/spec/tools/tests/` — the suite, its fakes (`fake-ref.ts`, `fake-record.ts`) and real-git helpers (`git-repo.ts`, `joined-repo.ts`)
- `skills/spec/principles.md` §13 — tests at the right grain
- `docs/specs/_playbook/` — settings and gates for this repo
