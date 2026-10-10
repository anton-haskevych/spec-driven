---
created: 2026-10-10T12:36:13-07:00
updated: 2026-10-10T13:32:28-07:00
status: draft
area: [tools, sub-commands]
domain: [spec-workflow]
scope: [improvement]
priority: p1
related:
  - pr-babysit: owns the PR moment (the one PR question, launch babysit, Spec-state PR records); edits the same mode files, whoever lands second merges main
  - spec-loop-automation: phase 9 put plain-words Outcome lines in phase files; this spec carries them into every chat report
---

# Self-Driving Loop Spec

The loop moves between Anton's decisions without him relaying, retyping or re-confirming:
a bare "1" launches the next session and it starts without asking "go"; every report opens
with impact, what merging does and what's left; good defaults are applied and listed, not
asked; parallel sessions on one spec stop colliding on shared spec files; the tools work
from any folder and the start-up context fits. First release is cheap and mostly prose; a
one-step sync and one-step start/close come later.

## Files

| File | Purpose |
|------|---------|
| `seed.md` | Origin: the 70-session CRM transcript review and Anton's picks |
| `product-brief.md` | Business intent from prep |
| `design.md` | Problem, decisions, the rules as the user sees them, what's deferred |
| `technical.md` | Exact files and edits, code contracts for phase 4 |
| `progress.md` | Thin index of phases (checkboxes + pointers) |
| `pr-opening.md` | PR-readiness gate — spec state + pre-PR checks (not a phase) |
| `code-map.md` | Load-bearing files inventory |
| `phases/` | Per-phase detail — one entry per phase |
| `ledger/INDEX.md` | Forward-propagating learnings — scan here first |
| `in-flight.md` | Ephemeral pending state (on-demand) |
| `reviews/` | Collegium review snapshots (on-demand) |
| `research/` | Prep recon: waves 1, 2, 2b (pr-babysit) + craft |

## Relationship to code

This spec is a *design document*, not a live mirror. Ground truth:
- `skills/spec/SKILL.md` (*Next sessions*, *Tools*), `execute.md`, `handoff.md`, `update.md`, `resume.md`
- `skills/spec/tools/spec.ts`, `tools/core/spec-folders.ts`, `tools/context/packs.ts`, `scripts/spec-bump.sh`
- `skills/spec/tools/tests/skill-wiring.test.ts` pins the prose
