---
date: 2026-10-01
wave: 3
lens: implementation
slug: seed-shape-and-edges
brief: product-brief.md
---

# Recon Wave 3 — seed-shape-and-edges

*Source of record — do not edit. explore-waves wave 3 (2 Explore agents): tool behaviour on a seed-only
folder, and CRM precedent (`~/IdeaProjects/crm/docs/specs/`, 2026-09-30).*

## Verified

- **Seed-only folder B** (`CLAUDE.md` status prep + `seed.md` + `research/`): doctor clean unless the
  project taxonomy omits `prep` (`doctor/spec-meta.ts:16-17`); no tool reads `seed.md` or `research/`
  (`graph/suggest.ts:12`, `hooks/spec-file-check.ts:60`); `list` row `| B | prep | … | — |`.
- **Parent A with phase `needs: [B]`**: doctor error `needs B: B has no phase`, the spec-file hook blocks
  the write, and the ready set waits forever with `needs B (B has no phase)`, even after B is done.
  Spec-level `needs: [B]` in A's CLAUDE.md works: `graph A` → `Blocked by: B`.
- `context/infer-spec.ts:7-17`: if B's seed files are changed on the same branch as A's, a nameless
  `/spec execute` sees two candidates and asks. Committing doesn't change that on a feature branch until
  merged; naming the spec avoids it.
- **What hand-made stubs lost** (CRM `customer-data-storage`, `gift-cards`, `pass-rollover`, all written
  21:08 in one go): verbatim user rules (`academy-ballroom-migration/design.md:22,32` → paraphrased);
  rejected options; the parent's concrete contract (Phase 13 key layout, Phase 14 route ownership, Phase
  15 renewals rule); evidence paths (only pass-rollover pointed at research); the parent's due date and
  its `needs:` on them. Phases waiting on them carried `**Blocked by spec:** … add needs: [<spec>#<N>]
  here once its phases exist` (`phases/phase-13…:10`, `14…:10`, `15…:10`).
- Richer precedent: `explicit-charge-handling/CLAUDE.md:24-31` (dated user quote, recon summary, read-first
  order, hub journal, next step); `lambda-fleet-standard/CLAUDE.md:12-15` (split out of X; which phase the
  parent needs). Parent-agent research files use `date, lens, slug`, no `wave`/`from`, provenance in prose
  ("spot-checked by the session", corrections noted).

## Reuse

- The wave file format (*Verified / Reuse / Still open*) for wave 0, plus `from:`.
- The "first consumer" / "split out of" phrasing as the seed's *What <parent> needs* section.

## Still open

- None blocking. Launch is verified by a manual iTerm run at the PR gate.
