---
needs: [3]
code: false
---

# Phase 6 — Seed CRM's focus set

**Goal:** CRM's specs that Anton named on 2026-10-07 carry `focus:`, ranked and on `main`, and both
developers' boards open on them.

**Outcome:** The board in CRM shows the team's real priorities from day one · minutes · risk: wrong
order (Anton confirms it before writing).

## Implementation guidance

Anton, 2026-10-07: "All of those … are active, and we work on them … They are our high priorities …
We need to have them shipped as soon as possible, all of them prioritized." He called
multi-location-studios and cross-studio "insanely important".

Proposed order (confirm with Anton before writing): multi-location-studios, cross-studio,
frontend-crash-safety (due 10-18), recurring-series-lifecycle-clarity (due 10-14),
academy-ballroom-migration (due 11-25), getting-started, local-test-cost, fast-parallel-backend-tests,
ci-optimization, dependency-currency, forms-standard, public-booking-path-guard. Ask whether Taras's
gift-cards joins the set; if so, set `owner: taras` in its `CLAUDE.md`.

From any CRM checkout, with the released plugin, run `spec.ts focus add <spec>` once per spec, in order.
Each run lands on `main` itself.

## Deliverables

- [ ] Order confirmed by Anton (date + his words)
- [ ] `focus:` written with `spec.ts focus add` for each spec and landed on CRM `main` (commit shas)
- [ ] `/spec list` in CRM opens on FOCUS in that order; screenshot or pasted lane in the evidence
- [ ] Taras told the set exists and how to change it (message link or date)
