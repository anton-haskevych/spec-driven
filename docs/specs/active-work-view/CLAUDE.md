---
created: 2026-10-07T18:39:32-07:00
updated: 2026-10-07T20:01:37-07:00
status: active
area: [tools, sub-commands]
domain: [spec-workflow]
scope: [feature]
priority: p1
related:
  - spec-board: built the board, claims and session liveness this spec extends
  - spec-loop-automation: also edits frontmatter-patch.ts (setFrontmatterLine) and commands/context.ts; rebase on its changes
---

# Active Work View Spec

A team-shared, ranked **focus set** (`focus: <rank>` in each spec's `CLAUDE.md`, plus the documented
`owner:`; written straight onto the default branch by `spec.ts focus`) and a **FOCUS** section at the
top of `/spec list`: per focus spec, progress, what is happening now and who is on it (this repo's
sessions on this machine, plus a teammate's claims and open PRs). Live claims idle for 2+ days show
under needs you. No focus set → today's lanes, unchanged.

## Files

| File | Purpose |
|------|---------|
| `product-brief.md` | Business intent from prep |
| `design.md` | Problem, decisions, board wireframes, copy, edge cases |
| `technical.md` | Focus field, base-first writer, model types, attribution rules, file tree |
| `progress.md` | Thin index of phases (checkboxes + pointers) |
| `pr-opening.md` | PR-readiness gate — spec state + pre-PR checks (not a phase) |
| `code-map.md` | Load-bearing files inventory |
| `phases/` | Per-phase detail |
| `ledger/INDEX.md` | Forward-propagating learnings — scan here first |
| `research/` | Prep recon: wave 1 (implementation) + craft |
| `in-flight.md` | Ephemeral pending state (on-demand) |
| `reviews/` | Collegium review snapshots (on-demand) |

## Relationship to code

This spec is a *design document*, not a live mirror. For ground truth see `skills/spec/tools/board/`,
`sessions/`, `claims/`, `skills/spec/list.md`, `skills/spec/SKILL.md` (*Tools*, *Next sessions*) and
`docs/specs/spec-board/` (the board's own spec and ledger).
