# Ledger Index (layout v1)

Warm cache for forward-propagating learnings. One row per ledger entry with its
`[applies-to]` scope tag. See `SKILL.md` for entry format and filtering rules.

## Gotchas
- `gotcha-readers-outside-the-spec-state-funnel.md` — [phase 2a+] — five readers bypass SpecState; move each or it reads frozen files

## Principles
- `principle-record-reuses-the-house-loop-and-cache.md` — [phase 1+] — reuse land-on-main loop, claim lease, base cache, field readers

## Domain

## Decisions
- `decision-writes-are-plans-rerun-per-tip.md` — [general, load-bearing] — a write is a plan re-run per tip; outbox holds intents
- `decision-progress-md-stays-as-a-stub-export-is-the-way-back.md` — [phase 2+] — never delete progress.md; record export is the rollback
- `decision-one-phase-writer-port-for-both-homes.md` — [phase 3+] — one PhaseWriter port; mode files never branch on joined
- `decision-codex-reads-the-board-refuses-writes.md` — [phase 3+] — Codex pilot reads a joined spec, phase writes refuse (Anton)
- `decision-data-moving-releases-raise-the-layout.md` — [phase 6, 7, 8] — PR C/D/E raise RECORD_LAYOUT and upgrade specs on touch

## Workarounds
