---
created: 2026-09-30T14:26:45-07:00
updated: 2026-09-30T20:45:12-07:00
status: active
area: [tools, hooks, sub-commands]
domain: [spec-workflow]
scope: [improvement, bugfix]
---

# Spec Loop Automation Spec

## Files

| File | Purpose |
|------|---------|
| `product-brief.md` | Business intent from prep |
| `design.md` | Problem, decisions, flows, edge cases |
| `technical.md` | Command contracts, settings schema, architecture |
| `progress.md` | Thin index of phases (checkboxes + pointers) |
| `pr-opening.md` | PR-readiness gate — spec state + pre-PR checks (not a phase) |
| `code-map.md` | Load-bearing files inventory |
| `phases/` | Per-phase detail — one entry per phase |
| `ledger/INDEX.md` | Forward-propagating learnings — scan here first |
| `in-flight.md` | Ephemeral pending state (on-demand) |
| `reviews/` | Collegium review snapshots (on-demand) |
| `research/` | Prep recon: waves 1–2 (implementation) + craft |

## Relationship to code

This spec is a *design document*, not a live mirror. Ground truth:
- `skills/spec/SKILL.md` and the mode files beside it (`execute.md`, `handoff.md`, `update.md`, `create.md`, `resume.md`)
- `skills/spec/tools/` — the Bun CLI (`spec.ts`), hooks, and tests
- `ROADMAP.md` — design rules (zero runtime deps, fail open, degrade without Bun)
- First adopter: `~/IdeaProjects/crm` (`docs/specs/_playbook/`, `.gitattributes`)
