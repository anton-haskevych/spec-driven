---
created: 2026-10-17T20:27:53-07:00
updated: 2026-10-17T21:04:00-07:00
status: draft
area: [tools, sub-commands]
domain: [spec-workflow]
scope: [feature]
related:
  - oversee-crew-spec: the crew's tick refill and hand launch are what this filters
  - spec-board: the board's "me" and ready lane are what this filters
  - pr-babysit: also edits core/git.ts; runnerName sits beside authorName, no shared logic
  - spec-loop-automation: also edits core/git.ts; no shared logic
  - active-work-view: built --who, people.ts matching and the owner field on focus rows; this extends them past FOCUS
ship: auto
---

# Owner Split Spec

Each person's crew and suggestions offer only their own work plus unowned work; anyone can
ask what a person is working on. Owners are set only on someone's explicit word.

## Files

| File | Purpose |
|------|---------|
| `product-brief.md` | Business intent from prep |
| `design.md` | Behaviour, decisions, CLI copy, edge cases |
| `technical.md` | Types, functions, CLI contracts, file tree |
| `progress.md` | Thin index of phases (checkboxes + pointers) |
| `pr-opening.md` | PR-readiness gate — spec state + pre-PR checks (not a phase) |
| `code-map.md` | Load-bearing files inventory |
| `phases/` | Per-phase detail — one entry per phase |
| `ledger/INDEX.md` | Forward-propagating learnings — scan here first |
| `in-flight/` | Ephemeral pending state, one file per phase (on-demand) |
| `reviews/` | Collegium review snapshots (on-demand) |
| `research/` | Prep recon waves (wave 1 = seams, craft = naming/fixtures/extraction) |

## Relationship to code

This spec is a design document, not a live mirror. Ground truth:
- `skills/spec/SKILL.md` (*Next sessions*, *Priority, due dates and owners*), `skills/spec/oversee-crew.md`, `skills/spec/list.md`
- `skills/spec/tools/board/`, `skills/spec/tools/crew/`, `skills/spec/tools/commands/crew/`, `skills/spec/tools/core/`
