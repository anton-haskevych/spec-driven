---
needs: [7]
code: false
---

# Phase 6 — Seed CRM's focus set

**Goal:** The CRM specs Anton put in bands on 2026-10-08 carry `focus: must | should | could` on
`main`, Taras's specs carry `owner: taras`, and both developers' boards open on them.

**Outcome:** The board in CRM shows the team's real priorities in words both developers read the same
way · minutes · risk: the four 2.37.0 numeric values are left behind. They read as `should`; this
phase rewrites them.

## Implementation guidance

The order of events:
- **2026-10-07.** Anton: "All of those … are active, and we work on them … They are our high
  priorities … We need to have them shipped as soon as possible, all of them prioritized." He called
  multi-location-studios and cross-studio "insanely important".
- **2026-10-07, 21:04.** Another session added four numeric ranks to main: user-facing-error-messages
  10, explicit-charge-handling 20, schedule-lifecycle-safety 30, recurring-series-lifecycle-clarity 40.
- **2026-10-08.** Anton sorted the specs by weight:
  - "Ultra important": academy-ballroom-migration.
  - "Hella important": multi-location-studios, cross-studio, tap-to-pay-payments.
  - "Very important": user-facing-error-messages, explicit-charge-handling, schedule-lifecycle-safety.
  - "So important": permission-aware-ui, gift-cards.
  - "Important but could wait": frontend-crash-safety, getting-started.
  - DX that "should be running in the background if computer resources and mental space are
    available": local-test-cost, fast-parallel-backend-tests, ci-optimization, dependency-currency.
  - "Least": unified-schedule-calendar, forms-standard.
  - He said gift-cards' owner is Taras.
- **Bands.** MoSCoW, which Anton approved ("All good. Go"):

```
must    academy-ballroom-migration · multi-location-studios · cross-studio · tap-to-pay-payments (owner: taras)
should  user-facing-error-messages · explicit-charge-handling · schedule-lifecycle-safety
        permission-aware-ui (owner: taras) · gift-cards (owner: taras)
        alert-noise-cleanup (its phase 2 blocks user-facing-error-messages)
could   recurring-series-lifecycle-clarity (4a, 6a left) · frontend-crash-safety · getting-started
        local-test-cost · fast-parallel-backend-tests · ci-optimization · dependency-currency
out     unified-schedule-calendar · forms-standard · automated-messages (2 cleanup phases left)
        public-booking-path-guard · dynasty-website-overhaul · ballroom-page · pass-rollover
```

**How to write it:**
1. Install the release that carries phase 7 on Anton's machine, and tell Taras to update too. 2.37.0
   reads `focus: must` as malformed.
2. From any CRM checkout, run `spec.ts focus add <spec> <band>` once per spec. For the four specs with
   numbers, run `focus add`; it overwrites the legacy value. Each run lands on `main` by itself.
3. Write `owner: taras` on the three specs that are Taras's in one docs commit onto `origin/main`
   (CRM is `docs: main`), from a clean tree.

**staff-app-access** (Taras, PR #913) is only on its branch, so `focus add` refuses it. Ask Anton for a
band once #913 merges.

**Heads-up for the weekly re-band:** should holds five specs due 10-14 while must comes first.

## Deliverables

- [x] Bands confirmed by Anton — 2026-10-08 in the phase-6 session: weights quoted above, MoSCoW approved ("All good. Go"), gift-cards "owner is Taras"
- [x] `focus:` bands written with `spec.ts focus add` for each spec and landed on CRM `main`, legacy numbers rewritten (commit shas) — 2026-10-08, CRM main: 17 commits ce63c41 … 6bd139a via spec.ts focus add (2.40.0); the four numeric values rewritten
- [x] `owner: taras` on tap-to-pay-payments, permission-aware-ui and gift-cards, on CRM `main` (commit sha) — 2026-10-08, CRM main 30c09f8
- [x] `/spec list` in CRM opens on FOCUS with MUST / SHOULD / COULD as above; the lane pasted in the evidence — 2026-10-08, CRM origin/main 30c09f8: lane below under Phase-local notes
- [x] Taras told the set exists, what the bands mean and how to change them (message link or date) — 2026-10-08: Anton's call — Taras learns through his own Claude Code; list.md → Focus ships the bands and how to change them in 2.40.0 (he needs that version)

## Phase-local notes

CRM `board focus`, 2026-10-08 15:23, origin/main 30c09f8 (who column trimmed):

```
FOCUS
  MUST
  1   academy-ballroom-migration          13/17  ready 16 · due 11-25
  2   cross-studio                        2/16   ready 1a, 6, 5
  3   multi-location-studios              5/12   ready 6
  4   tap-to-pay-payments                 0/3    ready 1                       — (taras)
  SHOULD
  5   alert-noise-cleanup                 3/8    ready 4, 5, 6 +1 · due 10-14
  6   explicit-charge-handling            draft  ready: /spec create · due 10-14
  7   permission-aware-ui                 draft  ready: /spec create · due 10-14   — (taras)
  8   schedule-lifecycle-safety           draft  ready: /spec create · due 10-14
  9   user-facing-error-messages          draft  ready: /spec create · due 10-14
  10  gift-cards                          0/9    executing 1, 2, 3, 4a, 5, 5a, 6 · due 11-20   taraskorpach: 7 claims 1d
  COULD
  11  recurring-series-lifecycle-clarity  14/16  blocked: needs explicit-charge-handling · due 10-14
  12  frontend-crash-safety               3/15   ready 2, 4, 1 +2 · due 10-18
  13  dependency-currency                 6/16   ready 5, 4a
  14  getting-started                     6/9    ready 9
  15  local-test-cost                     5/9    ready 4
  16  ci-optimization                     14/18  ready 12, 10, 13
  17  fast-parallel-backend-tests         10/13  executing 11
```
