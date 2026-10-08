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
- [ ] `focus:` bands written with `spec.ts focus add` for each spec and landed on CRM `main`, legacy numbers rewritten (commit shas)
- [ ] `owner: taras` on tap-to-pay-payments, permission-aware-ui and gift-cards, on CRM `main` (commit sha)
- [ ] `/spec list` in CRM opens on FOCUS with MUST / SHOULD / COULD as above; the lane pasted in the evidence
- [ ] Taras told the set exists, what the bands mean and how to change them (message link or date)
