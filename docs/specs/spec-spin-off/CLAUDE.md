---
created: 2026-10-01T12:23:20-07:00
updated: 2026-10-01T12:26:58-07:00
status: active
priority: p1
area: [tools, sub-commands]
domain: [spec-workflow]
scope: [feature]
related:
  - spec-loop-automation: same toolchain (Runner, command table, phase writers); this adds the between-specs step
---

# Spec Spin-off Spec

A session working on one spec often discovers the next spec it needs. Today that new spec is prepped
inline, on a full context, or hand-stubbed differently every time. Spin-off hands it to a fresh session
through a seed: the user's words, decisions, inherited recon and what the parent needs.

## Files

| File | Purpose |
|------|---------|
| `product-brief.md` | Business intent |
| `design.md` | Decisions, the spin-off flow, edge cases |
| `technical.md` | seed.md and wave-0 formats, `launch` contract, whole-spec `needs` rule |
| `progress.md` | Thin index of phases |
| `pr-opening.md` | PR-readiness gate |
| `code-map.md` | Load-bearing files |
| `phases/` | One entry per phase |
| `ledger/INDEX.md` | Forward-propagating learnings |
| `research/` | Recon waves 1–3 (explore-waves, 2026-10-01) |

## Relationship to code

Ground truth: `skills/spec/prep.md`, `SKILL.md`, `create.md`, `update.md`, `resume.md`; `skills/spec/tools/`
(`ready/refs.ts`, `graph/nodes.ts`, the new `launch/` module and `commands/launch.ts`).
Evidence: two CRM sessions on 2026-09-30 (academy-ballroom-migration create; explicit-charge-handling
spun out of the recurring-series review) that each improvised this step.
