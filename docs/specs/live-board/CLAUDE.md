---
created: 2026-11-11T17:46:05-08:00
updated: 2026-11-11T19:42:13-08:00
status: draft
area: [tools, sub-commands, hooks]
domain: [spec-workflow]
scope: [feature]
related:
  - codex-runtime-support: defined the SessionRef type phase 9 keys sessions by; its open phases 2b, 3b and 4 edit the same files (context, claim, board load, trees place, hooks, crew run state); a Codex pilot reads a joined spec and can't write it until that spec adds board writes; no dependency either way (Anton, 2026-11-11)
  - spec-board: built the board model and lanes; their inputs change from files per worktree to the shared record
  - active-work-view: built the per-person view and owner rows the record-backed board must keep
  - oversee-crew-spec: the crew reads the ready lane and keeps questions in run.md; phase 7 moves questions onto the record
  - pr-babysit: writes the PR open and merge lines that phase 6 turns into PR records
  - spec-loop-automation: built the phase writers (tick, add, split, park) that phase 3 points at the record
  - self-driving-loop: built the packs that phase 2 feeds from the record
---

# Live Board Spec

One shared record of cards, specs, phases, PRs, questions and sessions that every session writes to as it
works and reads before it acts. Spec documents stay as files.

Two pages explain it. Anton confirmed the data model's two calls and the implementation's decisions on
2026-11-11 (quotes in `design.md` → *Key decisions*):
- Data model: https://claude.ai/artifact/UtB3HsPKyqBLMupkt1hn2g
- Implementation: https://claude.ai/artifact/47cx1m6MJBwKoYXmh63gww

## Files

| File | Purpose |
|------|---------|
| `product-brief.md` | Business intent from prep |
| `design.md` | Decisions, flows, what Claude and people see, edge cases |
| `technical.md` | Record layout, document shapes, write protocol, commands, file tree |
| `progress.md` | Thin index of phases (checkboxes + pointers) |
| `pr-opening.md` | PR-readiness gate — spec state + pre-PR checks (not a phase) |
| `code-map.md` | Load-bearing files inventory |
| `phases/` | Per-phase detail — one entry per phase |
| `ledger/INDEX.md` | Forward-propagating learnings — scan here first |
| `in-flight/` | Ephemeral pending state, one file per phase (on-demand) |
| `reviews/` | Collegium review snapshots: `2026-11-11-write-contract-and-switch-day.md` re-planned phases 1–4 |
| `research/` | Prep recon: wave 1 (entities and usage), wave 2 (store, seam, packaging), craft |

## Relationship to code

This spec is a *design document*, not a live mirror. For ground truth see:
- `skills/spec/SKILL.md` — layout rules and the *Tools* section every command is documented in
- `ROADMAP.md` — the plugin's rules (agentic only, zero dependencies, no SessionStart hook) and release table
- `skills/spec/tools/` — the code; `tests/` beside it
- The Academy board this generalises lives in the CRM repo: `ops/src/academy-board/` and
  `.claude/skills/academy-ballroom-board/`
