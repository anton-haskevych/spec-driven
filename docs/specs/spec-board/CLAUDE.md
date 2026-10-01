---
created: 2026-10-01T13:23:56-07:00
updated: 2026-10-01T14:02:29-07:00
status: draft
area: [tools, sub-commands]
domain: [spec-workflow]
scope: [feature]
related:
  - spec-loop-automation: built the ready set, packs and pr-status the board reads
  - spec-spin-off: built launch; the board picks the phases parallel sessions start on
---

# Spec Board Spec

`/spec list` opens a board of every open phase in one of four lanes (in flight, ready, blocked,
needs you), built from `origin/<default>` plus every worktree's unmerged spec docs, live Claude
sessions, phase claims and GitHub PRs. Same output from any checkout. Layered: source adapters →
plain `BoardInputs` → pure `buildBoard` → `Board` model (versioned JSON) → views (terminal now).

## Files

| File | Purpose |
|------|---------|
| `product-brief.md` | Business intent from prep |
| `design.md` | Problem, decisions, layers, board output and copy, edge cases |
| `technical.md` | Types, source contracts, overlay and lane rules, claims, commands, file tree |
| `progress.md` | Thin index of phases (checkboxes + pointers) |
| `pr-opening.md` | PR-readiness gate — spec state + pre-PR checks (not a phase) |
| `code-map.md` | Load-bearing files inventory |
| `phases/` | One entry per phase |
| `ledger/INDEX.md` | Forward-propagating learnings — scan here first |
| `research/` | Prep: wave 0 (plan session), wave 1 (sources and layers), craft wave |
| `in-flight.md` | Ephemeral pending state (on-demand) |
| `reviews/` | Collegium review snapshots (on-demand) |

Plan page from the session that started this spec: https://claude.ai/artifact/SmttAvDXDxvzzA1yq5cyVt

## Relationship to code

This spec is a design document, not a live mirror. Ground truth: `skills/spec/SKILL.md` (*Tools*,
*Next-chunk rule*, *Relations between specs*), `skills/spec/principles.md`, `ROADMAP.md`
(*Rules for every release*), and `skills/spec/tools/`.
