---
created: 2026-10-10T12:36:13-07:00
updated: 2026-10-10T15:23:06-07:00
status: active
area: [tools, sub-commands]
domain: [spec-workflow]
scope: [feature]
priority: p1
related:
  - spec-loop-automation: built pr-status, push and project settings (pr.draft, pr.merge, external checks) this spec drives
  - spec-board: board PR cells and needs-you merge/fix rows must read the same green verdict
  - self-driving-loop: chains sessions around the PR moment this spec owns
---

# PR Babysit Spec

At the moment a spec's PR is ready, the agent asks one question: babysit it to merged, open
it as a draft, or merge now. On "babysit" a dedicated session waits on CI in the background,
sorts out failures, merges on green pinned to the head, and records the merge. Every check's
state and every babysit step are visible through `spec.ts pr status` and `spec.ts pr log`.

## Files

| File | Purpose |
|------|---------|
| `product-brief.md` | Business intent from prep |
| `design.md` | The question, the babysit flow, states, copy, decisions |
| `technical.md` | Commands, verdict model, log format, settings, file tree |
| `progress.md` | Thin index of phases (checkboxes + pointers) |
| `pr-opening.md` | PR-readiness gate — spec state + pre-PR checks (not a phase) |
| `code-map.md` | Load-bearing files inventory |
| `phases/` | Per-phase detail |
| `ledger/INDEX.md` | Forward-propagating learnings — scan here first |
| `in-flight.md` | Ephemeral pending state (on-demand) |
| `reviews/` | Collegium review snapshots (on-demand) |
| `research/` | Prep recon: `2026-10-10-wave-1-pr-moment-ci-reality.md`, `2026-10-10-craft-pr-commands-verdict-fixtures.md` |

## Relationship to code

This spec is a *design document*, not a live mirror. For ground truth see
`skills/spec/SKILL.md` (Tools → Remote), `skills/spec/execute.md` §10, `skills/spec/tools/pr/`,
and in CRM `.claude/rules/git-workflow.md` and `docs/specs/_playbook/settings.md`.
