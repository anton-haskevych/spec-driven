---
created: 2026-11-17T03:39:27-08:00
updated: 2026-11-17T14:54:12-08:00
status: draft
area: [tools, sub-commands]
domain: [spec-workflow]
scope: [feature]
priority: p1
related:
  - oversee-crew-spec: built the whole-board overseer; this spec adds a one-spec mode beside it and leaves the whole-board run as is
  - pr-babysit: owns babysit and pr open; this spec gives pr open a spec-branch head and teaches babysit to merge main into the spec branch
  - live-board: touches phase-writer.ts and ready-set.ts; no ownership split
  - fast-tests: its phase 8 owns the fast CrewDeps builder and dropping crew-deps.ts from HELPER_EXCEPTIONS; phase 1 builds it only if that hasn't landed
---

# Oversee One Spec Spec

`/spec oversee-crew <spec>` points an overseer at one spec. It lays out the build order, runs
that spec's lanes (PR groups) in parallel as background workers, gathers all their work on one
spec branch `feat/<spec>`, and ships it as one final PR in the spec's ship mode. A group that must
go live early still ships alone from main. Several overseers run at once, one per spec, under a
machine-wide worker limit. Born from the overnight CRM run on `migration-reconciliation-rules`
(2026-11-17), which did all of this by hand through brief notes.

## Files

| File | Purpose |
|------|---------|
| `product-brief.md` | Business intent from prep |
| `design.md` | Flows, decisions table (with the persona council's input), edge cases, copy |
| `technical.md` | Run files, branch base, merge-back command, close-out/prune, final PR, ship-alone, build order |
| `progress.md` | Thin index of phases (checkboxes + pointers) |
| `pr-opening.md` | PR-readiness gate — spec state + pre-PR checks (not a phase) |
| `code-map.md` | Load-bearing files inventory |
| `phases/` | Per-phase detail — one entry per phase |
| `ledger/INDEX.md` | Forward-propagating learnings — scan here first |
| `in-flight/` | Ephemeral pending state, one file per phase (on-demand) |
| `reviews/` | Collegium review snapshots (on-demand) |
| `research/` | Prep recon: waves 1–2 (crew state, branches, build order, the CRM run's evidence) and the craft wave |

## Relationship to code

This spec is a *design document*, not a live mirror. For ground truth see:
- `skills/spec/oversee-crew.md`, `skills/spec/crew-brief.md`, `skills/spec/handoff.md` §3–§4, `skills/spec/babysit.md`
- `skills/spec/tools/crew/`, `tools/commands/crew/`, `tools/trees/`, `tools/publish/`, `tools/pr/`, `tools/ready/`
